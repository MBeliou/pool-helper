// ──────────────────────────────────────────────────────────────────────
// Guidance engine (spec §5–§6): pure function (readings, config) → guidance.
//
// 1. Derive per-parameter targets from the pool config (targets.ts).
// 2. Build candidate adjustments in spec priority order:
//      0 safety-FC · 1 CYA · 2 pH · 3 TA · 4 CH/saturation · 5 FC fine-tune
// 3. Sequence with retest-gating: an adjustment is DEFERRED when an
//    already-emitted action moves the parameter it targets or one of the
//    readings its own reasoning depends on. Never two actions that fight.
//
// No dosing here — actions carry current/target deltas; fixPlan.ts maps
// them onto the calibrated dose computation in dosing.ts.
// ──────────────────────────────────────────────────────────────────────
import {
	PH_BAND,
	PH_MAX_STEP_PER_DOSE,
	chBand,
	cyaBand,
	sanitizerLevelLabel,
	sanitizerTargets,
	surfaceNeedsCalcium,
	taBand,
	type GuidanceConfig
} from './targets';
import { assessSaturation, defaultTdsPpm, type SaturationAssessment } from './saturationIndex';

/** canonical readings (ppm / pH / °C); null = not measured in this test */
export interface GuidanceReadings {
	/** free chlorine — or TOTAL BROMINE for bromine pools (same column, same math) */
	fc: number | null;
	/** total chlorine (chlorine pools; strips show both) — combined = tc − fc */
	tc: number | null;
	ph: number | null;
	ta: number | null;
	ch: number | null;
	cya: number | null;
	temp: number | null;
}

export type GuidanceParameter = 'fc' | 'ph' | 'ta' | 'ch' | 'cya';

export type ActionKind =
	| 'dose' // add a measured product — fixPlan attaches the dose
	| 'dilute' // raisable-only parameter too high — partial drain & refill
	| 'aerate' // pH up without chemicals / TA-down acid+aeration cycles
	| 'swg-output'; // adjust the salt cell's output percentage

export interface GuidanceAction {
	parameter: GuidanceParameter;
	kind: ActionKind;
	status: 'low' | 'high';
	/** raise/lower the parameter (dilution is always 'lower') */
	direction: 'raise' | 'lower';
	currentValue: number;
	/** where THIS dose aims (per-pass clamped — may sit short of the final target) */
	targetValue: number;
	title: string;
	/** root-cause reasoning shown to the user ("high TA keeps dragging pH up…") */
	why: string | null;
	sideEffects: string[];
	/** what to do after the main step (run pump, retest, repeat) — in order */
	followUpSteps: string[];
	priority: number;
}

export interface DeferredAdjustment {
	parameter: GuidanceParameter;
	title: string;
	/** why it must wait ("the acid dose is already lowering it — retest first") */
	reason: string;
}

export type VerdictStatus = 'ok' | 'low' | 'high' | 'wont-hold' | 'not-tested';

export interface ParameterVerdict {
	parameter: GuidanceParameter | 'temp';
	status: VerdictStatus;
	note: string | null;
}

export interface GuidanceResult {
	/** actions safe to do now, in priority order — the fix plan */
	actions: GuidanceAction[];
	/** adjustments held back until after a retest, with the reason */
	deferred: DeferredAdjustment[];
	verdicts: ParameterVerdict[];
	/** readings the engine needs and doesn't have (e.g. temp for the saturation check) */
	requestInput: { parameter: GuidanceParameter | 'temp'; reason: string }[];
	saturation: SaturationAssessment | null;
	/**
	 * combined (used-up) chlorine = total − free, when both were measured on a
	 * chlorine pool; null otherwise. The eye-sting/"chlorine smell" culprit.
	 */
	combinedChlorine: number | null;
	/** the parameter actually driving the situation (test 2: TA, not pH) */
	rootCause: GuidanceParameter | null;
}

// internal: a candidate adjustment before sequencing
interface CandidateAdjustment extends Omit<GuidanceAction, 'priority'> {
	priority: number;
	/** parameters this action moves (perturbation edges, spec §5) */
	moves: GuidanceParameter[];
	/** readings this action's reasoning depends on — pending changes invalidate it */
	dependsOn: GuidanceParameter[];
	/** overrides result.rootCause when this lands first (test 2: acid action, TA cause) */
	rootCauseOverride?: GuidanceParameter;
	deferReason?: never;
}

// below this the water is unsafe no matter what CYA turns out to be — the
// safety rule (spec §6 rule 0) must fire even when the FC target is undefined
const ABSOLUTE_MIN_FC = 1;
const ABSOLUTE_MIN_FC_RAISE_TARGET = 3;

// Combined (used-up) chlorine bands. TFP treats CC ≤ 0.5 ppm as normal, and
// reserves the SLAM shock for algae or PERSISTENT chloramines — a lone mild
// reading is handled by restoring FC to target and letting FC + sunlight burn
// the CC off. A single reading is also noisy at this scale (FAS-DPD resolves
// 0.2–0.5 ppm per drop, ~±0.4 ppm accuracy; strips are worse), so the engine
// only prescribes the shock when CC is beyond plausible noise or has proven
// itself across tests:
//   < 0.5        nothing
//   0.5 – 1.0    note it + "retest total chlorine" follow-up on the FC raise
//   1.0 – 2.0    same, but shock if it has PERSISTED across 3 tests (context)
//   ≥ 2.0        shock now (replaces the plain raise)
const COMBINED_CHLORINE_NOTE_PPM = 0.5;
const COMBINED_CHLORINE_PERSIST_PPM = 1.0;
const COMBINED_CHLORINE_SHOCK_PPM = 2.0;
// Persistence = the latest test plus two priors all at CC ≥ 1.0, each pair of
// counted tests at least 12 h apart (same-evening retests are one water state,
// not persistence) and all within a week of the latest test — one week is well
// past "FC + sunlight clears it". Exported so call sites size their history
// fetch from the same window.
export const COMBINED_CHLORINE_PERSISTENCE_WINDOW_DAYS = 7;
const COMBINED_CHLORINE_MIN_RETEST_GAP_HOURS = 12;
const COMBINED_CHLORINE_PERSISTENCE_PRIOR_COUNT = 2;
// shock target when the FC/CYA targets are undefined (CYA ≈ 0 outdoors)
const FALLBACK_SHOCK_TARGET_PPM = 10;

const AFTER_ACID_STEPS = [
	'Run the pump for about an hour',
	'Retest pH — still high? Repeat this step tomorrow'
];

/** a prior test, reduced to what CC-persistence needs — no DB shape leaks in */
export interface PriorChlorineReading {
	testedAt: Date;
	fc: number | null;
	tc: number | null;
}

/** optional history context — specs and legacy callers omit it entirely */
export interface GuidanceContext {
	/** when the current readings were taken — anchors the persistence window */
	testedAt?: Date;
	/** tests taken before the current one (any order; the engine filters) */
	priorTests?: PriorChlorineReading[];
}

/**
 * CC ≥ 1.0 on the latest test alone is within a mild band — but the same level
 * confirmed on two earlier, independent tests inside the week is persistence,
 * which is exactly what TFP says warrants the SLAM shock.
 */
function combinedChlorinePersists(
	latestCombined: number,
	context: GuidanceContext
): boolean {
	if (
		latestCombined < COMBINED_CHLORINE_PERSIST_PPM ||
		latestCombined >= COMBINED_CHLORINE_SHOCK_PPM ||
		context.testedAt === undefined
	)
		return false;
	const windowMs = COMBINED_CHLORINE_PERSISTENCE_WINDOW_DAYS * 24 * 3600 * 1000;
	const gapMs = COMBINED_CHLORINE_MIN_RETEST_GAP_HOURS * 3600 * 1000;
	const anchorMs = context.testedAt.getTime();
	const qualifying = (context.priorTests ?? [])
		.filter((prior) => {
			if (prior.fc === null || prior.tc === null) return false;
			const priorCombined = Math.max(0, prior.tc - prior.fc);
			const ageMs = anchorMs - prior.testedAt.getTime();
			return priorCombined >= COMBINED_CHLORINE_PERSIST_PPM && ageMs > 0 && ageMs <= windowMs;
		})
		.map((prior) => prior.testedAt.getTime())
		.sort((a, b) => b - a);
	// count newest-first, skipping tests too close to the previously counted
	// one — each counted test must be its own water state
	let counted = 0;
	let lastCountedMs = anchorMs;
	for (const priorMs of qualifying) {
		if (lastCountedMs - priorMs < gapMs) continue;
		counted += 1;
		lastCountedMs = priorMs;
		if (counted >= COMBINED_CHLORINE_PERSISTENCE_PRIOR_COUNT) return true;
	}
	return false;
}

export function runGuidance(
	readings: GuidanceReadings,
	config: GuidanceConfig,
	context: GuidanceContext = {}
): GuidanceResult {
	const verdicts: ParameterVerdict[] = [];
	const requestInput: GuidanceResult['requestInput'] = [];
	const candidates: CandidateAdjustment[] = [];
	let rootCause: GuidanceParameter | null = null;

	const sanitizerName = sanitizerLevelLabel(config.sanitizer).label.toLowerCase();
	const cyaTargetBand = cyaBand(config);
	const levelTargets = sanitizerTargets(config, readings.cya);
	const alkalinityBand = taBand(config);
	const hardnessBand = chBand(config);

	const chlorineWontHold =
		config.sanitizer !== 'bromine' &&
		config.location === 'outdoor' &&
		readings.cya !== null &&
		readings.cya < 10;

	// combined (used-up) chlorine — chlorine pools only; bromine has no free/combined split
	const combinedChlorine =
		config.sanitizer !== 'bromine' && readings.fc !== null && readings.tc !== null
			? Math.round(Math.max(0, readings.tc - readings.fc) * 10) / 10
			: null;
	const chloramineShockReason: 'high' | 'persistent' | null =
		combinedChlorine === null
			? null
			: combinedChlorine >= COMBINED_CHLORINE_SHOCK_PPM
				? 'high'
				: combinedChlorinePersists(combinedChlorine, context)
					? 'persistent'
					: null;
	const needsChloramineShock = chloramineShockReason !== null;
	// elevated but mild: normal FC + sunlight usually clears it — no shock yet
	const combinedChlorineElevated =
		combinedChlorine !== null &&
		combinedChlorine >= COMBINED_CHLORINE_NOTE_PPM &&
		!needsChloramineShock;
	const combinedChlorineNote =
		chloramineShockReason === 'high'
			? `About ${combinedChlorine} ppm of the chlorine is used up — only a shock clears it.`
			: chloramineShockReason === 'persistent'
				? `Combined chlorine has held above 1 ppm across your recent tests — a shock is due.`
				: combinedChlorineElevated
					? `About ${combinedChlorine} ppm of the chlorine is used up (combined). Normal chlorine plus sunlight usually clears this on its own — retest free AND total chlorine after your next top-up. Still above 0.5 combined? Then a shock is due.`
					: null;
	// mild-CC extras for the plain FC raises: keep the CC fact visible on the
	// verdict AND inside the action's why (verdict notes are swallowed on the
	// results screen whenever an action owns the parameter), and make the
	// raise's follow-up cover the "does it persist?" check
	const withMildCombinedNote = (note: string) =>
		combinedChlorineElevated && combinedChlorineNote ? `${note} ${combinedChlorineNote}` : note;
	const withMildCombinedWhy = (why: string) =>
		combinedChlorineElevated
			? `${why} There's also about ${combinedChlorine} ppm of used-up (combined) chlorine — mild for now; the retest step below tells you whether it clears or a shock is due.`
			: why;
	const mildCombinedFollowUp = combinedChlorineElevated
		? ['Retest total chlorine too — if combined (total − free) is still above 0.5, shock at dusk']
		: [];

	// ── CYA (priority 1) ────────────────────────────────────────────────
	if (cyaTargetBand === null) {
		// bromine pool: stabiliser does nothing for bromine — informational only
		if (readings.cya !== null && readings.cya > 0) {
			verdicts.push({
				parameter: 'cya',
				status: 'ok',
				note: 'Stabiliser has no effect on bromine — nothing to do with it.'
			});
		}
	} else if (readings.cya === null) {
		verdicts.push({ parameter: 'cya', status: 'not-tested', note: null });
		if (config.sanitizer !== 'bromine' && config.location === 'outdoor') {
			requestInput.push({
				parameter: 'cya',
				reason: `Your ${sanitizerName} target depends on stabiliser — test CYA to get one.`
			});
		}
	} else if (readings.cya < cyaTargetBand.low) {
		verdicts.push({
			parameter: 'cya',
			status: 'low',
			note: chlorineWontHold
				? `With no stabiliser, sunlight destroys ${sanitizerName} within hours.`
				: null
		});
		candidates.push({
			parameter: 'cya',
			kind: 'dose',
			status: 'low',
			direction: 'raise',
			currentValue: readings.cya,
			targetValue: cyaTargetBand.target,
			title: 'Raise stabiliser',
			why: chlorineWontHold
				? `This is the root problem: without stabiliser, UV burns off ${sanitizerName} within hours — no chlorine level can hold until CYA is up.`
				: `Stabiliser shields ${sanitizerName} from sunlight.`,
			sideEffects: [`your ${sanitizerName} target rises with CYA — re-derive after`],
			followUpSteps: [
				'Put the granules in a sock in the skimmer basket',
				'Retest stabiliser in 2–3 days — it dissolves slowly'
			],
			priority: 1,
			moves: ['cya'],
			dependsOn: []
		});
		if (chlorineWontHold) rootCause = 'cya';
	} else if (readings.cya > cyaTargetBand.high) {
		verdicts.push({ parameter: 'cya', status: 'high', note: null });
		const drainFraction = 1 - cyaTargetBand.target / readings.cya;
		candidates.push({
			parameter: 'cya',
			kind: 'dilute',
			status: 'high',
			direction: 'lower',
			currentValue: readings.cya,
			targetValue: cyaTargetBand.target,
			title: 'Lower stabiliser by diluting',
			why: `Too much stabiliser locks up your ${sanitizerName}, and it only leaves with the water.`,
			sideEffects: ['dilution also lowers TA, CH and salt'],
			followUpSteps: [
				`Drain about ${Math.round(drainFraction * 100)}% of the water and refill`,
				'Run the pump a few hours to mix, then retest everything'
			],
			priority: 1,
			moves: ['cya', 'ta', 'ch', 'fc'],
			dependsOn: []
		});
	} else {
		verdicts.push({ parameter: 'cya', status: 'ok', note: null });
	}

	// ── sanitizer level: safety floor (priority 0) + fine-tune (priority 5) ──
	// A chloramine shock covers any FC raise, so it REPLACES the plain safety
	// candidate (same parameter — one action, not two fighting ones).
	if (needsChloramineShock && readings.fc !== null) {
		candidates.push({
			parameter: 'fc',
			kind: 'dose',
			status: 'low',
			direction: 'raise',
			currentValue: readings.fc,
			targetValue: Math.max(levelTargets?.shock ?? FALLBACK_SHOCK_TARGET_PPM, readings.fc + 1),
			title: 'Shock to clear used-up chlorine',
			why:
				chloramineShockReason === 'persistent'
					? `Combined (used-up) chlorine has stayed above 1 ppm across your recent tests — normal chlorine and sunlight had their chance and aren't clearing it. It's what stings eyes and makes the strong "chlorine" smell. Ironically the fix is MORE chlorine: a shock clears the used-up part.`
					: `About ${combinedChlorine} ppm of your chlorine is used up (combined chlorine) — well beyond test noise, and more than daily chlorine and sunlight can burn off. It's what stings eyes and makes the strong "chlorine" smell. Ironically the fix is MORE chlorine: a shock clears the used-up part.`,
			sideEffects: [],
			followUpSteps: [
				'Shock at dusk (sunlight fights you) and run the pump overnight',
				'Retest free AND total chlorine tomorrow — combined should be near 0'
			],
			priority: 0,
			moves: ['fc'],
			dependsOn: []
		});
	}

	if (readings.fc === null) {
		// sanitation is the one reading the engine can't work around (spec §2 requiredFor)
		verdicts.push({ parameter: 'fc', status: 'not-tested', note: null });
		requestInput.push({
			parameter: 'fc',
			reason:
				config.sanitizer === 'bromine'
					? 'Total bromine is the sanitation reading — test it to know the water is safe.'
					: 'Free chlorine (not total chlorine — strips often show both) is the sanitation reading the plan is built around.'
		});
	} else if (levelTargets === null) {
		// outdoor chlorine pool with CYA ≈ 0 (or unknown): NEVER say "FC ok" (spec §3)
		if (readings.fc < ABSOLUTE_MIN_FC) {
			// …but the safety rule still fires: this little chlorine is unsafe
			// no matter what CYA turns out to be
			verdicts.push({
				parameter: 'fc',
				status: 'low',
				note: withMildCombinedNote(
					'Under-sanitised — bacteria and algae can gain ground. This comes first.'
				)
			});
			if (!needsChloramineShock)
				candidates.push({
					parameter: 'fc',
					kind: 'dose',
					status: 'low',
					direction: 'raise',
					currentValue: readings.fc,
					targetValue: ABSOLUTE_MIN_FC_RAISE_TARGET,
					title: 'Raise chlorine now',
					why: withMildCombinedWhy(
						readings.cya === null
							? 'Safety first: under-sanitised water gets worse by the hour. Test CYA too — without stabiliser, sunlight burns chlorine off within hours.'
							: 'Safety first: under-sanitised water gets worse by the hour. It will not hold until stabiliser is up — expect to re-dose.'
					),
					sideEffects: [],
					followUpSteps: [
						readings.cya === null
							? 'Retest chlorine in a few hours — and test stabiliser (CYA) too'
							: 'Retest chlorine in a few hours',
						...mildCombinedFollowUp
					],
					priority: 0,
					moves: ['fc'],
					dependsOn: []
				});
		} else {
			verdicts.push({
				parameter: 'fc',
				status: 'wont-hold',
				note:
					readings.cya === null
						? `Can't judge ${sanitizerName} without a CYA reading — its target is derived from stabiliser.`
						: `${readings.fc} ppm looks fine but WON'T HOLD — with stabiliser at 0, UV destroys it within hours. Fix CYA first.`
			});
		}
	} else {
		const raiseCeiling = Math.max(levelTargets.shock, levelTargets.target);
		if (readings.fc < levelTargets.min) {
			verdicts.push({
				parameter: 'fc',
				status: 'low',
				note: withMildCombinedNote(
					'Under-sanitised — bacteria and algae can gain ground. This comes first.'
				)
			});
			if (!needsChloramineShock) {
				candidates.push({
					parameter: 'fc',
					kind: 'dose',
					status: 'low',
					direction: 'raise',
					currentValue: readings.fc,
					targetValue: Math.min(levelTargets.target, raiseCeiling),
					title: config.sanitizer === 'bromine' ? 'Raise bromine now' : 'Raise chlorine now',
					why: withMildCombinedWhy(
						'Safety first: under-sanitised water is the one problem that gets worse by the hour.'
					),
					sideEffects:
						config.sanitizer === 'swg'
							? ['dose manually — the cell alone is too slow to catch up']
							: [],
					followUpSteps: [
						`Retest ${config.sanitizer === 'bromine' ? 'bromine' : 'chlorine'} in a few hours`,
						...mildCombinedFollowUp
					],
					priority: 0,
					moves: ['fc'],
					dependsOn: []
				});
			}
		} else if (readings.fc > levelTargets.high) {
			verdicts.push({
				parameter: 'fc',
				status: 'high',
				note:
					readings.fc > levelTargets.shock
						? `Very high — hold off swimming until it drifts below ~${levelTargets.high} ppm.`
						: 'A bit high — let it drift down on its own; add nothing.'
			});
		} else {
			verdicts.push({ parameter: 'fc', status: 'ok', note: combinedChlorineNote });
			if (!needsChloramineShock && readings.fc < levelTargets.target) {
				candidates.push({
					parameter: 'fc',
					kind: config.sanitizer === 'swg' ? 'swg-output' : 'dose',
					status: 'low',
					direction: 'raise',
					currentValue: readings.fc,
					targetValue: levelTargets.target,
					title:
						config.sanitizer === 'swg'
							? 'Nudge your salt cell output up'
							: config.sanitizer === 'bromine'
								? 'Top up bromine'
								: 'Top up chlorine',
					why: withMildCombinedWhy(
						config.sanitizer === 'swg'
							? `Above the safe floor but below target (${levelTargets.target} ppm) — raise the cell output a notch instead of dosing.`
							: `Above the safe floor but below the maintenance target of ${levelTargets.target} ppm.`
					),
					sideEffects: [],
					followUpSteps:
						config.sanitizer === 'swg'
							? [
									'Retest chlorine in a couple of days to confirm the new output holds',
									...mildCombinedFollowUp
								]
							: ['Retest tomorrow', ...mildCombinedFollowUp],
					priority: 5,
					moves: ['fc'],
					dependsOn: ['cya']
				});
			}
		}
	}

	// ── pH (priority 2) and TA (priority 3) — coupled by the carbonate buffer ──
	const alkalinityHigh = readings.ta !== null && readings.ta > alkalinityBand.high;
	const alkalinityLow = readings.ta !== null && readings.ta < alkalinityBand.low;

	if (readings.ph === null) {
		verdicts.push({ parameter: 'ph', status: 'not-tested', note: null });
	} else if (readings.ph > PH_BAND.high) {
		verdicts.push({ parameter: 'ph', status: 'high', note: null });
		candidates.push({
			parameter: 'ph',
			kind: 'dose',
			status: 'high',
			direction: 'lower',
			currentValue: readings.ph,
			targetValue: Math.max(PH_BAND.target, readings.ph - PH_MAX_STEP_PER_DOSE),
			title: alkalinityHigh ? 'Fix high alkalinity' : 'Lower pH',
			why: alkalinityHigh
				? 'The real cause is high alkalinity — it keeps dragging pH up. Acid lowers both, which is exactly what this pool needs. Plan on a few rounds over the coming days, and do NOT add anything to raise TA back.'
				: 'High pH weakens your sanitiser and irritates skin and eyes.',
			sideEffects: ['acid also lowers TA'],
			followUpSteps: AFTER_ACID_STEPS,
			priority: 2,
			moves: ['ph', 'ta'],
			dependsOn: [],
			rootCauseOverride: alkalinityHigh ? 'ta' : undefined
		});
	} else if (readings.ph < PH_BAND.low) {
		verdicts.push({ parameter: 'ph', status: 'low', note: null });
		const useAerationOnly = alkalinityHigh; // soda ash would push high TA higher
		candidates.push({
			parameter: 'ph',
			kind: useAerationOnly ? 'aerate' : 'dose',
			status: 'low',
			direction: 'raise',
			currentValue: readings.ph,
			targetValue: Math.min(PH_BAND.target, readings.ph + PH_MAX_STEP_PER_DOSE),
			title: useAerationOnly ? 'Raise pH by aeration' : 'Raise pH',
			why: useAerationOnly
				? 'Your alkalinity is already high, so skip soda ash: point returns at the surface, run water features — aeration raises pH without adding TA.'
				: 'Low pH is corrosive — it etches surfaces and attacks metal.',
			sideEffects: useAerationOnly ? [] : ['soda ash also raises TA slightly'],
			followUpSteps: useAerationOnly
				? [
						'Point the return jets up and run any water features',
						'Retest pH tomorrow — aeration is slow but free'
					]
				: ['Run the pump for about an hour', 'Retest pH before adding more'],
			priority: 2,
			moves: useAerationOnly ? ['ph'] : ['ph', 'ta'],
			dependsOn: []
		});
	} else {
		verdicts.push({ parameter: 'ph', status: 'ok', note: null });
	}

	if (readings.ta === null) {
		verdicts.push({ parameter: 'ta', status: 'not-tested', note: null });
	} else if (alkalinityLow) {
		verdicts.push({ parameter: 'ta', status: 'low', note: null });
		candidates.push({
			parameter: 'ta',
			kind: 'dose',
			status: 'low',
			direction: 'raise',
			currentValue: readings.ta,
			targetValue: alkalinityBand.target,
			title: 'Raise alkalinity',
			why: 'Alkalinity is the pH buffer — too low and pH swings on every splash of rain or acid.',
			sideEffects: ['baking soda nudges pH up slightly'],
			followUpSteps: ['Run the pump for about an hour', 'Retest alkalinity and pH'],
			priority: 3,
			moves: ['ta', 'ph'],
			dependsOn: ['ph']
		});
	} else if (alkalinityHigh) {
		verdicts.push({
			parameter: 'ta',
			status: 'high',
			note: 'High TA keeps pushing pH up.'
		});
		// generated even when pH is high: the sequencer then defers it behind the
		// acid dose (which already lowers TA) — spec §6 retest-gating example
		candidates.push({
			parameter: 'ta',
			kind: 'aerate',
			status: 'high',
			direction: 'lower',
			currentValue: readings.ta,
			targetValue: alkalinityBand.target,
			title: 'Lower alkalinity (acid + aeration cycles)',
			why: `Each acid-then-aerate cycle burns off some alkalinity without a "TA remover" product. Repeat until TA is near ${alkalinityBand.target} ppm.`,
			sideEffects: ['works in repeated small cycles'],
			followUpSteps: [
				`Add acid to pull pH down to ~${PH_BAND.low}`,
				`Aerate (jets up, water features on) until pH climbs back to ~${PH_BAND.target}`,
				'Retest pH and alkalinity, then repeat'
			],
			priority: 3,
			moves: ['ta', 'ph'],
			dependsOn: ['ph']
		});
	} else {
		verdicts.push({ parameter: 'ta', status: 'ok', note: null });
	}

	// ── CH & saturation index (priority 4) ─────────────────────────────
	let saturation: SaturationAssessment | null = null;
	const canComputeSaturation = readings.ph !== null && readings.ta !== null && readings.ch !== null;

	if (canComputeSaturation && readings.temp === null) {
		requestInput.push({
			parameter: 'temp',
			reason: 'Water temperature — needed to check for limescale and corrosion risk.'
		});
	}

	if (readings.ch === null) {
		verdicts.push({ parameter: 'ch', status: 'not-tested', note: null });
	} else {
		if (canComputeSaturation && readings.temp !== null) {
			saturation = assessSaturation({
				ph: readings.ph!,
				taPpm: readings.ta!,
				chPpm: readings.ch,
				temperatureC: readings.temp,
				cyaPpm: readings.cya ?? 0,
				tdsPpm: defaultTdsPpm(config.sanitizer)
			});
		}

		const hardnessLow = readings.ch < hardnessBand.low;
		const hardnessHigh = readings.ch > hardnessBand.high;
		const corrosive = saturation?.verdict === 'corrosive';
		const scaling = saturation?.verdict === 'scaling';

		if (corrosive || (hardnessLow && saturation === null && surfaceNeedsCalcium(config))) {
			verdicts.push({
				parameter: 'ch',
				status: 'low',
				note: corrosive
					? `Left alone, the water slowly eats at ${
							surfaceNeedsCalcium(config)
								? 'the plaster finish and metal equipment'
								: 'metal parts and heat exchangers'
						}.`
					: 'Left alone, the water pulls calcium out of the plaster finish.'
			});
			candidates.push({
				parameter: 'ch',
				kind: 'dose',
				status: 'low',
				direction: 'raise',
				currentValue: readings.ch,
				targetValue: Math.max(hardnessBand.target, readings.ch),
				title: 'Raise calcium hardness',
				why: corrosive
					? 'Calcium-starved water dissolves what it touches. Raising hardness is the safest way to bring the water back to balance.'
					: 'Calcium protects plaster-type finishes from etching.',
				sideEffects: ['a small pH/TA nudge may follow'],
				followUpSteps: ['Run the pump for a few hours', 'Retest hardness'],
				priority: 4,
				moves: ['ch'],
				dependsOn: ['ph', 'ta'],
				rootCauseOverride: 'ch'
			});
		} else if (scaling) {
			verdicts.push({
				parameter: 'ch',
				status: hardnessHigh ? 'high' : 'ok',
				note: 'Left alone, limescale — a white mineral crust — builds up on surfaces and equipment, and the water can turn cloudy.'
			});
			if (hardnessHigh) {
				candidates.push({
					parameter: 'ch',
					kind: 'dilute',
					status: 'high',
					direction: 'lower',
					currentValue: readings.ch,
					targetValue: hardnessBand.target,
					title: 'Lower calcium by diluting',
					why: 'Calcium only leaves with the water. Keeping pH at the low end of its band also holds limescale at bay meanwhile.',
					sideEffects: ['dilution also lowers CYA, TA and salt'],
					followUpSteps: [
						'Drain part of the water and refill',
						'Run the pump a few hours to mix, then retest everything'
					],
					priority: 4,
					moves: ['ch', 'cya', 'ta', 'fc'],
					dependsOn: ['ph', 'ta']
				});
			} else if (readings.ph !== null && readings.ph > PH_BAND.low + 0.1) {
				candidates.push({
					parameter: 'ph',
					kind: 'dose',
					status: 'high',
					direction: 'lower',
					currentValue: readings.ph,
					targetValue: Math.max(PH_BAND.low + 0.2, readings.ph - PH_MAX_STEP_PER_DOSE),
					title: 'Lower pH a touch (limescale control)',
					why: 'Limescale is starting to form; with calcium itself in range, pH is the quickest way to stop it.',
					sideEffects: ['acid also lowers TA'],
					followUpSteps: AFTER_ACID_STEPS,
					priority: 4,
					moves: ['ph', 'ta'],
					dependsOn: ['ph', 'ta'],
					rootCauseOverride: 'ch'
				});
			}
		} else if (hardnessHigh) {
			verdicts.push({
				parameter: 'ch',
				status: saturation ? 'ok' : 'high',
				note: saturation
					? 'Above the usual band, but the water is balanced overall — just watch it.'
					: 'High calcium — add a water temperature reading to check the limescale risk.'
			});
		} else if (hardnessLow && !surfaceNeedsCalcium(config)) {
			verdicts.push({
				parameter: 'ch',
				status: saturation ? 'ok' : 'low',
				note: saturation
					? 'Below the usual band, but the water is balanced and your surface tolerates it.'
					: null
			});
		} else if (hardnessLow) {
			// plaster-type surface, saturation balanced — still worth topping up slowly
			verdicts.push({
				parameter: 'ch',
				status: 'low',
				note: 'The water is balanced today, but low calcium leaves no buffer for winter (cold water is more corrosive).'
			});
			candidates.push({
				parameter: 'ch',
				kind: 'dose',
				status: 'low',
				direction: 'raise',
				currentValue: readings.ch,
				targetValue: hardnessBand.target,
				title: 'Raise calcium hardness',
				why: 'Calcium protects plaster-type finishes from etching.',
				sideEffects: ['a small pH/TA nudge may follow'],
				followUpSteps: ['Run the pump for a few hours', 'Retest hardness'],
				priority: 4,
				moves: ['ch'],
				dependsOn: ['ph', 'ta']
			});
		} else {
			verdicts.push({ parameter: 'ch', status: 'ok', note: null });
		}
	}

	if (readings.temp !== null) {
		verdicts.push({ parameter: 'temp', status: 'ok', note: null });
	}

	// ── sequencer: emit what's safe now, defer what a current fix perturbs ──
	candidates.sort((first, second) => first.priority - second.priority);
	const actions: GuidanceAction[] = [];
	const deferred: DeferredAdjustment[] = [];
	const movedParameters = new Set<GuidanceParameter>();
	const moverTitleByParameter = new Map<GuidanceParameter, string>();

	for (const candidate of candidates) {
		const blockedBy =
			(movedParameters.has(candidate.parameter) && candidate.parameter) ||
			candidate.dependsOn.find((dependency) => movedParameters.has(dependency));

		if (blockedBy) {
			const moverTitle = moverTitleByParameter.get(blockedBy as GuidanceParameter);
			deferred.push({
				parameter: candidate.parameter,
				title: candidate.title,
				reason:
					blockedBy === candidate.parameter
						? `“${moverTitle}” already moves it — retest before adjusting further.`
						: `Depends on ${parameterDisplayName(blockedBy as GuidanceParameter)}, which “${moverTitle}” is changing — retest first.`
			});
			continue;
		}

		actions.push({
			parameter: candidate.parameter,
			kind: candidate.kind,
			status: candidate.status,
			direction: candidate.direction,
			currentValue: candidate.currentValue,
			targetValue: candidate.targetValue,
			title: candidate.title,
			why: candidate.why,
			sideEffects: candidate.sideEffects,
			followUpSteps: candidate.followUpSteps,
			priority: candidate.priority
		});
		for (const movedParameter of candidate.moves) {
			movedParameters.add(movedParameter);
			if (!moverTitleByParameter.has(movedParameter)) {
				moverTitleByParameter.set(movedParameter, candidate.title);
			}
		}
		if (rootCause === null) rootCause = candidate.rootCauseOverride ?? candidate.parameter;
	}

	// FC target undefined (CYA=0 outdoor): surface the deferral explicitly (spec test 1)
	if (levelTargets === null && readings.fc !== null && config.sanitizer !== 'bromine') {
		deferred.push({
			parameter: 'fc',
			title: `${sanitizerLevelLabel(config.sanitizer).label} target`,
			reason:
				readings.cya === null
					? 'Undefined until stabiliser is measured — the target is derived from CYA.'
					: 'Undefined until stabiliser is set — retest and re-derive once CYA is up.'
		});
	}

	return { actions, deferred, verdicts, requestInput, saturation, combinedChlorine, rootCause };
}

export function parameterDisplayName(parameter: GuidanceParameter | 'temp'): string {
	switch (parameter) {
		case 'fc':
			return 'sanitiser level';
		case 'ph':
			return 'pH';
		case 'ta':
			return 'alkalinity';
		case 'ch':
			return 'calcium hardness';
		case 'cya':
			return 'stabiliser';
		case 'temp':
			return 'water temperature';
	}
}
