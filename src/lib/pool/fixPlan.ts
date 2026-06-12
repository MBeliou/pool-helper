// ──────────────────────────────────────────────────────────────────────
// Fix-plan derivation (the seam for the upcoming resolution pipeline).
// Targets are naive ideal-band midpoints; replace the selection logic,
// keep the shapes. All dose math is delegated to the canonical
// computation in dosing.ts — nothing here computes chemistry.
// ──────────────────────────────────────────────────────────────────────
import type { TestRow } from './db/schema';
import type { IconName } from './icons';
import { LITRES_PER_VOLUME_UNIT, type HardnessUnit, type VolumeUnit } from './units';
import {
	PARAMETERS,
	displayUnitText,
	displayValue,
	formatReading,
	parameterByKey,
	readingStatus,
	testValue,
	type DisplayUnits,
	type ParameterDefinition,
	type ParameterKey
} from './chemistry';
import {
	computeDose,
	formatDoseAmount,
	productsFor,
	type DoseRequest,
	type DosingProduct
} from './dosing';

export interface PoolDosingProfile {
	/** display string, e.g. "50,000" */
	volume: string;
	volumeUnit: VolumeUnit;
	hardnessUnit: HardnessUnit;
}

export interface FixAction {
	key: ParameterKey;
	status: 'low' | 'high';
	icon: IconName;
	title: string;
	/** "0.8 → 3.0 ppm" */
	rangeText: string;
	/** "Add 680 g" — null when the fix isn't a dosed product */
	doseText: string | null;
	productName: string;
	productOptions: DosingProduct[];
	/** canonical request kept so the product picker recomputes through computeDose */
	doseRequest: DoseRequest | null;
	/** rows for the expanded dosing-math panel */
	mathRows: [string, string][];
}

export interface InRangeReading {
	key: ParameterKey;
	icon: IconName;
	title: string;
	rangeText: string;
}

export interface FixPlanResult {
	actions: FixAction[];
	inRange: InRangeReading[];
}

// titles per parameter/direction; products come from the dosing catalogue
const ACTION_TITLES: Partial<Record<ParameterKey, Partial<Record<'low' | 'high', string>>>> = {
	fc: { low: 'Raise free chlorine', high: 'Let chlorine drift down' },
	ph: { low: 'Raise pH', high: 'Lower pH' },
	ta: { low: 'Raise alkalinity', high: 'Lower alkalinity' },
	ch: { low: 'Raise hardness', high: 'Lower hardness' },
	cya: { low: 'Raise stabiliser', high: 'Lower stabiliser' }
};

function idealMidpoint(parameter: ParameterDefinition): number {
	return ((parameter.idealLow ?? 0) + (parameter.idealHigh ?? 0)) / 2;
}

export function volumeToCubicMetres(volume: string, volumeUnit: VolumeUnit): number {
	const volumeNumber = Number(volume.replace(/[^0-9]/g, '')) || 0;
	return (volumeNumber * LITRES_PER_VOLUME_UNIT[volumeUnit]) / 1000;
}

function formatDisplayValue(
	parameter: ParameterDefinition,
	canonicalValue: number,
	displayUnits: DisplayUnits
): string {
	return formatReading(displayValue(parameter, canonicalValue, displayUnits), parameter.decimals);
}

/** dose text for a given product against an action's canonical request */
export function doseTextFor(request: DoseRequest, product: DosingProduct): string | null {
	const result = computeDose(request, product);
	return result ? formatDoseAmount(result) : null;
}

function mathRowsFor(
	action: { request: DoseRequest; parameter: ParameterDefinition; status: 'low' | 'high' },
	product: DosingProduct,
	displayUnits: DisplayUnits,
	unitText: string
): [string, string][] {
	const { request, parameter, status } = action;
	const delta = Math.abs(request.targetValue - request.currentValue);
	const rows: [string, string][] = [
		['Pool volume', `${request.poolVolumeLitres.toLocaleString('en-US')} L`],
		[
			`${status === 'low' ? 'Raise' : 'Lower'} ${parameter.shortLabel} by`,
			`${formatDisplayValue(parameter, delta, displayUnits)}${unitText ? ` ${unitText}` : ''}`
		]
	];
	if (product.basisLabel) rows.push([product.name, product.basisLabel]);
	if (parameter.key === 'ph' && request.totalAlkalinityPpm !== undefined) {
		rows.push(['Scaled by alkalinity', `${Math.round(request.totalAlkalinityPpm)} ppm`]);
	}
	if (product.sideEffectNote) rows.push(['Note', product.sideEffectNote]);
	return rows;
}

/** Re-derive an action's product-dependent fields after a product switch. */
export function repriceAction(
	action: FixAction,
	product: DosingProduct,
	hardnessUnit: HardnessUnit
): Pick<FixAction, 'productName' | 'doseText' | 'mathRows'> {
	if (!action.doseRequest || product.disabledReason) {
		return {
			productName: action.productName,
			doseText: action.doseText,
			mathRows: action.mathRows
		};
	}
	const parameter = parameterByKey[action.key];
	const displayUnits: DisplayUnits = { hardnessUnit, temperatureUnit: '°C' };
	return {
		productName: product.name,
		doseText: doseTextFor(action.doseRequest, product),
		mathRows: mathRowsFor(
			{ request: action.doseRequest, parameter, status: action.status },
			product,
			displayUnits,
			displayUnitText(parameter, displayUnits)
		)
	};
}

/** Derive the fix plan from the latest test. Targets are placeholder midpoints. */
export function computeFixPlan(
	latestTest: TestRow | undefined,
	poolProfile: PoolDosingProfile
): FixPlanResult {
	const actions: FixAction[] = [];
	const inRange: InRangeReading[] = [];
	if (!latestTest) return { actions, inRange };

	const poolVolumeLitres = volumeToCubicMetres(poolProfile.volume, poolProfile.volumeUnit) * 1000;
	const displayUnits: DisplayUnits = {
		hardnessUnit: poolProfile.hardnessUnit,
		temperatureUnit: '°C' // temperature is never dosed
	};
	const totalAlkalinityPpm = testValue(latestTest, 'ta') ?? undefined;

	for (const parameter of PARAMETERS) {
		if (parameter.key === 'temp') continue;
		const canonicalValue = testValue(latestTest, parameter.key);
		if (canonicalValue === null) continue;

		const status = readingStatus(parameter, canonicalValue);
		const unitText = displayUnitText(parameter, displayUnits);
		if (status === 'ok' || status === 'info') {
			inRange.push({
				key: parameter.key,
				icon: parameter.icon,
				title: parameter.shortLabel,
				rangeText:
					`${formatDisplayValue(parameter, canonicalValue, displayUnits)}` +
					`${unitText ? ` ${unitText}` : ''} · in range`
			});
			continue;
		}

		const title = ACTION_TITLES[parameter.key]?.[status];
		if (!title) continue;

		const target = idealMidpoint(parameter);
		const direction = status === 'low' ? 'raise' : 'lower';
		const productOptions = productsFor(parameter.key, direction);
		const defaultProduct = productOptions.find((product) => !product.disabledReason);
		const doseRequest: DoseRequest = {
			parameter: parameter.key,
			currentValue: canonicalValue,
			targetValue: target,
			poolVolumeLitres,
			totalAlkalinityPpm
		};
		const currentText = formatDisplayValue(parameter, canonicalValue, displayUnits);
		const targetText = formatDisplayValue(parameter, target, displayUnits);

		actions.push({
			key: parameter.key,
			status,
			icon: parameter.icon,
			title,
			rangeText: `${currentText} → ${targetText}${unitText ? ` ${unitText}` : ''}`,
			doseText: defaultProduct ? doseTextFor(doseRequest, defaultProduct) : null,
			productName: defaultProduct?.name ?? '',
			productOptions,
			doseRequest: defaultProduct ? doseRequest : null,
			mathRows: defaultProduct
				? mathRowsFor(
						{ request: doseRequest, parameter, status },
						defaultProduct,
						displayUnits,
						unitText
					)
				: []
		});
	}

	return { actions, inRange };
}
