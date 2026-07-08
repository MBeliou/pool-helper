// ──────────────────────────────────────────────────────────────────────
// Guidance engine — derived chemistry targets (spec §2–§4).
//
// Targets are FUNCTIONS of the pool config (sanitiser, surface, sun),
// not static bands. The keystone: free chlorine scales with stabiliser
// (fcTargetsFromCya). Sources per docs/pool-guidance-engine-spec.md §10;
// bromine figures per docs/guidance-engine-implementation-notes.md.
// ──────────────────────────────────────────────────────────────────────

export type SanitizerType = 'chlorine' | 'swg' | 'bromine';
export type SurfaceType = 'plaster' | 'vinyl' | 'fibreglass' | 'tile';
export type PoolLocation = 'outdoor' | 'indoor';
export type SunExposure = 'full' | 'partial' | 'low';

export interface GuidanceConfig {
	/** pool volume in litres; 0 or null = unknown (doses are suppressed, verdicts still run) */
	volumeLitres: number | null;
	sanitizer: SanitizerType;
	surface: SurfaceType;
	location: PoolLocation;
	/** only meaningful outdoors; indoor pools see no UV regardless */
	sunExposure: SunExposure;
}

/** low/high = acceptable band; target = where a dose aims */
export interface TargetBand {
	low: number;
	high: number;
	target: number;
}

// ── profile-string → engine-enum mappers (onboarding stores display labels) ──

export function sanitizerTypeFromProfile(sanitiserLabel: string): SanitizerType {
	const label = sanitiserLabel.toLowerCase();
	if (label.includes('salt') || label.includes('swg')) return 'swg';
	if (label.includes('brom')) return 'bromine';
	return 'chlorine';
}

export function surfaceTypeFromProfile(surfaceLabel: string): SurfaceType {
	const label = surfaceLabel.toLowerCase();
	if (label.includes('vinyl')) return 'vinyl';
	if (label.includes('fibre') || label.includes('fiber')) return 'fibreglass';
	if (label.includes('tile')) return 'tile';
	return 'plaster';
}

export function locationFromProfile(locationLabel: string): PoolLocation {
	return locationLabel.toLowerCase().includes('in') ? 'indoor' : 'outdoor';
}

export function sunExposureFromProfile(sunExposureLabel: string): SunExposure {
	const label = sunExposureLabel.toLowerCase();
	if (label.includes('full')) return 'full';
	if (label.includes('low') || label.includes('shade')) return 'low';
	return 'partial';
}

// ── sanitizer level (FC, or total bromine for bromine pools) ──────────

/** display label for the sanitizer-level parameter */
export function sanitizerLevelLabel(sanitizer: SanitizerType): {
	label: string;
	shortLabel: string;
} {
	return sanitizer === 'bromine'
		? { label: 'Bromine', shortLabel: 'Bromine' }
		: { label: 'Free chlorine', shortLabel: 'Free Cl' };
}

export interface SanitizerTargets {
	/** below this the water is under-sanitised — safety action (spec §6 rule 0) */
	min: number;
	/** maintenance dose target */
	target: number;
	/** upper edge of the acceptable band (above = let it drift down) */
	high: number;
	/** SLAM/shock ceiling — hard cap for any single raise */
	shock: number;
}

// FC/CYA ratios — TFP relationship, spec §3 [S1]
const CHLORINE_MIN_FC_PER_CYA = 0.075;
const CHLORINE_TARGET_FC_PER_CYA = 0.115;
const SWG_MIN_FC_PER_CYA = 0.045;
const SWG_TARGET_FC_PER_CYA = 0.05;
const SHOCK_FC_PER_CYA = 0.4;
// acceptable-band headroom above target before we call the level "high"
const FC_HIGH_OVER_TARGET = 1.3;

// Indoor/no-UV pools hold chlorine without stabiliser — static band applies
// when CYA is (correctly) near zero. TFP indoor guidance, see implementation notes.
const INDOOR_STATIC_FC: SanitizerTargets = { min: 1, target: 3, high: 4, shock: 10 };

// Bromine: total Br 3–5 ppm, floor 2, shock ~10+ (TFP "How to maintain a bromine
// pool"; ANSI/APSP-11 2–8 ppm). No CYA relationship — CYA does not protect bromine.
const BROMINE_TARGETS: SanitizerTargets = { min: 2, target: 4, high: 5, shock: 10 };

/**
 * The keystone derivation (spec §3): sanitizer targets as f(CYA).
 * Returns null when no meaningful target exists — outdoor chlorine pool with
 * CYA at 0: UV destroys chlorine within hours, so "FC ok" must never be said.
 */
export function sanitizerTargets(
	config: GuidanceConfig,
	cyaPpm: number | null
): SanitizerTargets | null {
	if (config.sanitizer === 'bromine') return BROMINE_TARGETS;

	const seesUv = config.location === 'outdoor';
	const cya = cyaPpm ?? 0;
	if (cya < 10) {
		// effectively unstabilised
		if (!seesUv) return INDOOR_STATIC_FC;
		return null; // no target can hold — CYA is the root cause
	}

	const minRatio = config.sanitizer === 'swg' ? SWG_MIN_FC_PER_CYA : CHLORINE_MIN_FC_PER_CYA;
	const targetRatio =
		config.sanitizer === 'swg' ? SWG_TARGET_FC_PER_CYA : CHLORINE_TARGET_FC_PER_CYA;
	const target = roundPpm(targetRatio * cya);
	return {
		min: roundPpm(minRatio * cya),
		target,
		high: roundPpm(target * FC_HIGH_OVER_TARGET),
		shock: roundPpm(SHOCK_FC_PER_CYA * cya)
	};
}

function roundPpm(value: number): number {
	return Math.round(value * 10) / 10;
}

// ── CYA (stabiliser) ───────────────────────────────────────────────────

/**
 * cyaFromSanitizer (spec §4) extended with location/sun (user decision):
 * indoor pools need no stabiliser (flag only when high); low-sun outdoor
 * runs 20–30; SWG runs high (70–80) so the cell's chlorine survives.
 * Bromine: CYA does nothing — no target (null).
 */
export function cyaBand(config: GuidanceConfig): TargetBand | null {
	if (config.sanitizer === 'bromine') return null;
	if (config.location === 'indoor') return { low: 0, high: 30, target: 20 };
	if (config.sanitizer === 'swg') {
		return config.sunExposure === 'low'
			? { low: 40, high: 60, target: 50 }
			: { low: 70, high: 80, target: 75 };
	}
	return config.sunExposure === 'low'
		? { low: 20, high: 30, target: 25 }
		: { low: 30, high: 50, target: 40 };
}

// ── pH ────────────────────────────────────────────────────────────────

/** static band 7.2–7.8, aim mid of 7.4–7.6 (spec §2) */
export const PH_BAND: TargetBand = { low: 7.2, high: 7.8, target: 7.5 };
/** max pH change per dose — incremental dosing guard (spec §7 maxSafeStep) */
export const PH_MAX_STEP_PER_DOSE = 0.6;

// ── TA (total alkalinity) ─────────────────────────────────────────────

/** taFromSanitizer (spec §4): TFP 60–90 manual, 60–80 SWG (spec follows TFP over industry 80–120) */
export function taBand(config: GuidanceConfig): TargetBand {
	return config.sanitizer === 'swg'
		? { low: 60, high: 80, target: 70 }
		: { low: 60, high: 90, target: 70 };
}

// ── CH (calcium hardness) ─────────────────────────────────────────────

/**
 * chFromSurface (spec §4): a surface-appropriate STARTING band — the final
 * acceptable CH is governed by the saturation index, not this band.
 * Calcium protects plaster/tile; vinyl & fibreglass need much less.
 */
export function chBand(config: GuidanceConfig): TargetBand {
	return config.surface === 'plaster' || config.surface === 'tile'
		? { low: 250, high: 350, target: 300 }
		: { low: 175, high: 225, target: 200 };
}

/** surfaces where low calcium actively damages the pool (etching) */
export function surfaceNeedsCalcium(config: GuidanceConfig): boolean {
	return config.surface === 'plaster' || config.surface === 'tile';
}
