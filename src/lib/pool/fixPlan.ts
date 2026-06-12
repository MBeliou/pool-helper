// ──────────────────────────────────────────────────────────────────────
// PLACEHOLDER fix-plan computation.
// This module is the seam for the upcoming problem-resolution pipeline:
// it derives "what to fix" actions from the latest test using naive
// midpoint targets and rough dose factors tuned to match the design
// prototype's example numbers. Replace the logic, keep the shapes.
// ──────────────────────────────────────────────────────────────────────
import type { TestRow } from './db/schema';
import type { IconName } from './icons';
import type { HardnessUnit, VolumeUnit } from './units';
import {
	PARAMETERS,
	displayUnitText,
	displayValue,
	formatReading,
	readingStatus,
	testValue,
	type DisplayUnits,
	type ParameterDefinition,
	type ParameterKey
} from './chemistry';

export interface PoolDosingProfile {
	/** display string, e.g. "50,000" */
	volume: string;
	volumeUnit: VolumeUnit;
	hardnessUnit: HardnessUnit;
}

export interface ProductOption {
	name: string;
	/** grams (or millilitres for liquids) per canonical-unit delta per m³ */
	dosePerUnitPerCubicMetre: number;
	liquid?: boolean;
	disabledReason?: string;
}

export interface FixAction {
	key: ParameterKey;
	status: 'low' | 'high';
	icon: IconName;
	title: string;
	/** "0.8 → 3.0 ppm" */
	rangeText: string;
	/** "Add 1.4 kg" — null when the fix isn't a dosed product */
	doseText: string | null;
	productName: string;
	productOptions: ProductOption[];
	/** rows for the expanded dosing-math panel */
	mathRows: [string, string][];
	/** inputs kept so the product picker can recompute doses */
	canonicalDelta: number;
	cubicMetres: number;
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

// dose factors tuned to reproduce the design's example doses
const CHLORINE_PRODUCTS: ProductOption[] = [
	{ name: 'Cal-Hypo 65%', dosePerUnitPerCubicMetre: 12.7 },
	{ name: 'Liquid chlorine 12.5%', dosePerUnitPerCubicMetre: 74.5, liquid: true },
	{ name: 'Dichlor 56%', dosePerUnitPerCubicMetre: 14.5 },
	{ name: 'Trichlor tabs', dosePerUnitPerCubicMetre: 0, disabledReason: 'not for shock' }
];

interface ParameterFixRule {
	title: string;
	productOptions: ProductOption[];
}

// per-parameter, per-direction placeholder rules
const FIX_RULES: Partial<Record<ParameterKey, Partial<Record<'low' | 'high', ParameterFixRule>>>> = {
	fc: {
		low: { title: 'Raise free chlorine', productOptions: CHLORINE_PRODUCTS },
		high: { title: 'Let chlorine drift down', productOptions: [] }
	},
	ph: {
		// design example: 680 g dry acid lowers pH by 0.4 in a 50 m³ pool → 34 g per pH unit per m³
		low: { title: 'Raise pH', productOptions: [{ name: 'Soda ash', dosePerUnitPerCubicMetre: 30 }] },
		high: { title: 'Lower pH', productOptions: [{ name: 'Dry acid', dosePerUnitPerCubicMetre: 34 }] }
	},
	ta: {
		low: { title: 'Raise alkalinity', productOptions: [{ name: 'Baking soda', dosePerUnitPerCubicMetre: 1.7 }] },
		high: { title: 'Lower alkalinity', productOptions: [] }
	},
	ch: {
		low: { title: 'Raise hardness', productOptions: [{ name: 'Calcium chloride', dosePerUnitPerCubicMetre: 1.5 }] },
		high: { title: 'Lower hardness', productOptions: [] }
	},
	cya: {
		low: { title: 'Raise stabiliser', productOptions: [{ name: 'Cyanuric acid', dosePerUnitPerCubicMetre: 1 }] },
		high: { title: 'Lower stabiliser', productOptions: [] }
	}
};

function idealMidpoint(parameter: ParameterDefinition): number {
	return ((parameter.idealLow ?? 0) + (parameter.idealHigh ?? 0)) / 2;
}

export function volumeToCubicMetres(volume: string, volumeUnit: VolumeUnit): number {
	const volumeNumber = Number(volume.replace(/[^0-9]/g, '')) || 0;
	if (volumeUnit === 'gallons') return (volumeNumber * 3.785) / 1000;
	if (volumeUnit === 'm³') return volumeNumber;
	return volumeNumber / 1000; // litres
}

export function formatDose(amount: number, liquid = false): string {
	if (liquid) {
		return amount >= 1000 ? `Add ${(amount / 1000).toFixed(1)} L` : `Add ${Math.round(amount)} mL`;
	}
	return amount >= 1000 ? `Add ${(amount / 1000).toFixed(1)} kg` : `Add ${Math.round(amount)} g`;
}

export function productDose(
	product: ProductOption,
	canonicalDelta: number,
	cubicMetres: number
): string {
	if (product.disabledReason) return product.disabledReason;
	const amount = product.dosePerUnitPerCubicMetre * canonicalDelta * cubicMetres;
	return formatDose(amount, product.liquid);
}

function formatDisplayValue(
	parameter: ParameterDefinition,
	canonicalValue: number,
	displayUnits: DisplayUnits
): string {
	return formatReading(displayValue(parameter, canonicalValue, displayUnits), parameter.decimals);
}

/** Derive the fix plan from the latest test. Placeholder for the resolution pipeline. */
export function computeFixPlan(
	latestTest: TestRow | undefined,
	poolProfile: PoolDosingProfile
): FixPlanResult {
	const actions: FixAction[] = [];
	const inRange: InRangeReading[] = [];
	if (!latestTest) return { actions, inRange };

	const cubicMetres = volumeToCubicMetres(poolProfile.volume, poolProfile.volumeUnit);
	const displayUnits: DisplayUnits = {
		hardnessUnit: poolProfile.hardnessUnit,
		temperatureUnit: '°C' // temperature is never dosed
	};

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

		const rule = FIX_RULES[parameter.key]?.[status];
		if (!rule) continue;

		const target = idealMidpoint(parameter);
		const canonicalDelta = Math.abs(target - canonicalValue);
		const currentText = formatDisplayValue(parameter, canonicalValue, displayUnits);
		const targetText = formatDisplayValue(parameter, target, displayUnits);
		const defaultProduct = rule.productOptions.find((product) => !product.disabledReason);

		actions.push({
			key: parameter.key,
			status,
			icon: parameter.icon,
			title: rule.title,
			rangeText: `${currentText} → ${targetText}${unitText ? ` ${unitText}` : ''}`,
			doseText: defaultProduct ? productDose(defaultProduct, canonicalDelta, cubicMetres) : null,
			productName: defaultProduct?.name ?? '',
			productOptions: rule.productOptions,
			canonicalDelta,
			cubicMetres,
			mathRows: defaultProduct
				? [
						['Pool volume', `${(cubicMetres * 1000).toLocaleString('en-US')} L`],
						[
							`${status === 'low' ? 'Raise' : 'Lower'} ${parameter.shortLabel} by`,
							`${formatDisplayValue(parameter, canonicalDelta, displayUnits)}${unitText ? ` ${unitText}` : ''}`
						],
						[defaultProduct.name, `×${defaultProduct.dosePerUnitPerCubicMetre} g/m³`]
					]
				: []
		});
	}

	return { actions, inRange };
}
