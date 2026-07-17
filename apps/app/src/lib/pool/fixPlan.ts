// ──────────────────────────────────────────────────────────────────────
// Fix-plan derivation — the bridge from the guidance engine to the UI.
// Target selection, root-cause reasoning and sequencing live in
// guidance/engine.ts (pure, spec-tested); this module renders the
// engine's actions into display shapes and attaches doses through the
// canonical computation in dosing.ts — nothing here computes chemistry.
// ──────────────────────────────────────────────────────────────────────
import type { TestRow } from './db/schema';
import type { IconName } from './icons';
import { localeTag } from './localeFormat';
import { LITRES_PER_VOLUME_UNIT, type HardnessUnit, type VolumeUnit } from './units';
import {
	displayUnitText,
	displayValue,
	formatReading,
	parameterByKey,
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
import {
	runGuidance,
	type GuidanceContext,
	type GuidanceReadings,
	type GuidanceResult
} from './guidance/engine';
import { resolveTesterType, type TesterType } from './data';
import {
	locationFromProfile,
	sanitizerLevelLabel,
	sanitizerTypeFromProfile,
	sunExposureFromProfile,
	surfaceTypeFromProfile,
	type GuidanceConfig
} from './guidance/targets';

export interface PoolGuidanceProfile {
	/** pool volume in volumeUnit, as a real number (null = not set) */
	volume: number | null;
	volumeUnit: VolumeUnit;
	hardnessUnit: HardnessUnit;
	// profile display strings as stored ('Salt (SWG)', 'Mostly shaded', …)
	surface: string;
	sanitiser: string;
	location: string;
	sunExposure: string;
}

export interface FixAction {
	key: ParameterKey;
	status: 'low' | 'high';
	icon: IconName;
	title: string;
	/** "0.8 → 3.0 ppm" */
	rangeText: string;
	/** root-cause reasoning ("high TA keeps dragging pH up…") — null when self-evident */
	why: string | null;
	/**
	 * steps after the main one (run pump, retest, repeat). For dose actions the
	 * UI renders step 1 itself from doseText + productName ("Add 2.3 kg of Dry
	 * acid") so the amount is welded to the product; these follow from step 2.
	 * For non-dose actions these are ALL the steps, from step 1.
	 */
	followUpSteps: string[];
	/** engine side effects — rendered inside the math panel only */
	sideEffects: string[];
	/** "Add 680 g" — null when the fix isn't a dosed product (dilution, aeration, SWG dial) */
	doseText: string | null;
	productName: string;
	productOptions: DosingProduct[];
	/** canonical request kept so the product picker recomputes through computeDose */
	doseRequest: DoseRequest | null;
	/** rows for the expanded dosing-math panel */
	mathRows: [string, string][];
}

export interface DeferredFix {
	key: ParameterKey;
	title: string;
	/** why it waits ("the acid dose is already lowering it — retest first") */
	reason: string;
}

export interface InRangeReading {
	key: ParameterKey;
	icon: IconName;
	title: string;
	rangeText: string;
}

export interface FixPlanResult {
	/** actions safe to do now, in engine priority order */
	actions: FixAction[];
	/** adjustments gated behind a retest */
	deferred: DeferredFix[];
	inRange: InRangeReading[];
	/**
	 * consequence notes with no action of their own ("Left alone, limescale
	 * builds up…", "FC won't hold with CYA at 0") — shown below the actions
	 */
	warnings: string[];
	/** readings the engine wants next time ("water temperature for the limescale check") */
	requestInput: string[];
	/** general reliability hint when the latest test came off strips — null otherwise */
	testerHint: string | null;
}

/** history + tester context the call sites fetch alongside the latest test */
export interface FixPlanContext {
	/** e.g. getTestsSince(COMBINED_CHLORINE_PERSISTENCE_WINDOW_DAYS + 3) — any order */
	recentTests?: TestRow[];
	/** listTesters() rows — structural match for resolveTesterType */
	storedTesters?: { name: string; type: TesterType }[];
}

const STRIPS_HINT =
	"Logged with test strips — they're rough near band edges. Confirm any surprising reading with a drop test before big corrections.";

/** the engine's history context from raw test rows — also used by the diagnose page */
export function guidanceContextFromHistory(
	latestTest: TestRow,
	{ recentTests = [] }: FixPlanContext
): GuidanceContext {
	return {
		testedAt: latestTest.testedAt,
		priorTests: recentTests
			.filter((test) => test.id !== latestTest.id && test.testedAt < latestTest.testedAt)
			.map((test) => ({
				testedAt: test.testedAt,
				fc: testValue(test, 'fc'),
				tc: test.totalChlorine
			}))
	};
}

export function volumeToCubicMetres(volume: number | null, volumeUnit: VolumeUnit): number {
	return ((volume ?? 0) * LITRES_PER_VOLUME_UNIT[volumeUnit]) / 1000;
}

export function guidanceConfigFromProfile(poolProfile: PoolGuidanceProfile): GuidanceConfig {
	return {
		volumeLitres: volumeToCubicMetres(poolProfile.volume, poolProfile.volumeUnit) * 1000,
		sanitizer: sanitizerTypeFromProfile(poolProfile.sanitiser),
		surface: surfaceTypeFromProfile(poolProfile.surface),
		location: locationFromProfile(poolProfile.location),
		sunExposure: sunExposureFromProfile(poolProfile.sunExposure)
	};
}

export function guidanceReadingsFromTest(latestTest: TestRow): GuidanceReadings {
	return {
		fc: testValue(latestTest, 'fc'),
		tc: latestTest.totalChlorine,
		ph: testValue(latestTest, 'ph'),
		ta: testValue(latestTest, 'ta'),
		ch: testValue(latestTest, 'ch'),
		cya: testValue(latestTest, 'cya'),
		temp: testValue(latestTest, 'temp')
	};
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
	action: {
		request: DoseRequest;
		parameter: ParameterDefinition;
		status: 'low' | 'high';
		sideEffects: string[];
	},
	product: DosingProduct,
	displayUnits: DisplayUnits,
	unitText: string
): [string, string][] {
	const { request, parameter, status, sideEffects } = action;
	const delta = Math.abs(request.targetValue - request.currentValue);
	const rows: [string, string][] = [
		['Pool volume', `${request.poolVolumeLitres.toLocaleString(localeTag())} L`],
		[
			`${status === 'low' ? 'Raise' : 'Lower'} ${parameter.shortLabel} by`,
			`${formatDisplayValue(parameter, delta, displayUnits)}${unitText ? ` ${unitText}` : ''}`
		]
	];
	if (product.basisLabel) rows.push([product.name, product.basisLabel]);
	if (parameter.key === 'ph' && request.totalAlkalinityPpm !== undefined) {
		rows.push(['Scaled by alkalinity', `${Math.round(request.totalAlkalinityPpm)} ppm`]);
	}
	// side effects live here, once — the engine's for the action, the product's
	// own only when the engine has none (avoids "also lowers TA" twice)
	for (const sideEffect of sideEffects) rows.push(['Side effect', sideEffect]);
	if (product.sideEffectNote && sideEffects.length === 0) {
		rows.push(['Side effect', product.sideEffectNote]);
	}
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
			{
				request: action.doseRequest,
				parameter,
				status: action.status,
				sideEffects: action.sideEffects
			},
			product,
			displayUnits,
			displayUnitText(parameter, displayUnits)
		)
	};
}

/** Derive the fix plan from the latest test through the guidance engine. */
export function computeFixPlan(
	latestTest: TestRow | undefined,
	poolProfile: PoolGuidanceProfile,
	fixPlanContext: FixPlanContext = {}
): FixPlanResult {
	const empty: FixPlanResult = {
		actions: [],
		deferred: [],
		inRange: [],
		warnings: [],
		requestInput: [],
		testerHint: null
	};
	if (!latestTest) return empty;

	const config = guidanceConfigFromProfile(poolProfile);
	const guidance: GuidanceResult = runGuidance(
		guidanceReadingsFromTest(latestTest),
		config,
		guidanceContextFromHistory(latestTest, fixPlanContext)
	);

	const displayUnits: DisplayUnits = {
		hardnessUnit: poolProfile.hardnessUnit,
		temperatureUnit: '°C' // temperature is never dosed
	};
	const totalAlkalinityPpm = testValue(latestTest, 'ta') ?? undefined;
	const levelShortLabel = sanitizerLevelLabel(config.sanitizer).shortLabel;

	const actions: FixAction[] = guidance.actions.map((engineAction) => {
		const parameter = parameterByKey[engineAction.parameter];
		const unitText = displayUnitText(parameter, displayUnits);
		const currentText = formatDisplayValue(parameter, engineAction.currentValue, displayUnits);
		const targetText = formatDisplayValue(parameter, engineAction.targetValue, displayUnits);
		const rangeText = `${currentText} → ${targetText}${unitText ? ` ${unitText}` : ''}`;

		// only real product doses go through the dosing catalogue
		if (engineAction.kind !== 'dose') {
			return {
				key: engineAction.parameter,
				status: engineAction.status,
				icon: parameter.icon,
				title: engineAction.title,
				rangeText,
				why: engineAction.why,
				followUpSteps: engineAction.followUpSteps,
				sideEffects: engineAction.sideEffects,
				doseText: null,
				productName: '',
				productOptions: [],
				doseRequest: null,
				mathRows: []
			};
		}

		const productOptions = productsFor(
			engineAction.parameter,
			engineAction.direction,
			config.sanitizer
		);
		const defaultProduct = productOptions.find((product) => !product.disabledReason);
		const doseRequest: DoseRequest = {
			parameter: engineAction.parameter,
			currentValue: engineAction.currentValue,
			targetValue: engineAction.targetValue,
			poolVolumeLitres: config.volumeLitres ?? 0,
			totalAlkalinityPpm
		};

		return {
			key: engineAction.parameter,
			status: engineAction.status,
			icon: parameter.icon,
			title: engineAction.title,
			rangeText,
			why: engineAction.why,
			followUpSteps: engineAction.followUpSteps,
			sideEffects: engineAction.sideEffects,
			doseText: defaultProduct ? doseTextFor(doseRequest, defaultProduct) : null,
			productName: defaultProduct?.name ?? '',
			productOptions,
			doseRequest: defaultProduct ? doseRequest : null,
			mathRows: defaultProduct
				? mathRowsFor(
						{
							request: doseRequest,
							parameter,
							status: engineAction.status,
							sideEffects: engineAction.sideEffects
						},
						defaultProduct,
						displayUnits,
						displayUnitText(parameter, displayUnits)
					)
				: []
		};
	});

	const deferred: DeferredFix[] = guidance.deferred.map((entry) => ({
		key: entry.parameter,
		title: entry.title,
		reason: entry.reason
	}));

	const inRange: InRangeReading[] = [];
	const warnings: string[] = [];
	const actionKeys = new Set(actions.map((action) => action.key));

	for (const verdict of guidance.verdicts) {
		if (verdict.parameter === 'temp' || verdict.status === 'not-tested') continue;
		const parameter = parameterByKey[verdict.parameter];
		const canonicalValue = testValue(latestTest, verdict.parameter);
		if (canonicalValue === null) continue;
		const unitText = displayUnitText(parameter, displayUnits);
		const title = verdict.parameter === 'fc' ? levelShortLabel : parameter.shortLabel;

		if (verdict.status === 'ok') {
			inRange.push({
				key: verdict.parameter,
				icon: parameter.icon,
				title,
				rangeText:
					`${formatDisplayValue(parameter, canonicalValue, displayUnits)}` +
					`${unitText ? ` ${unitText}` : ''} · in range`
			});
			if (verdict.note && !actionKeys.has(verdict.parameter)) {
				warnings.push(`${title}: ${verdict.note}`);
			}
		} else if (verdict.note && !actionKeys.has(verdict.parameter)) {
			// out-of-band (or won't-hold) with no action of its own — surface the reasoning
			warnings.push(`${title}: ${verdict.note}`);
		}
	}

	return {
		actions,
		deferred,
		inRange,
		warnings,
		requestInput: guidance.requestInput.map((request) => request.reason),
		testerHint:
			fixPlanContext.storedTesters &&
			resolveTesterType(latestTest.tester, fixPlanContext.storedTesters) === 'strips'
				? STRIPS_HINT
				: null
	};
}
