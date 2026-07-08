// ──────────────────────────────────────────────────────────────────────
// Langelier Saturation Index (spec §4) — derived diagnostic, never user-set.
// Uses the CYA-corrected carbonate alkalinity (spec's v1.1 refinement [S8]):
// stabiliser inflates measured TA by ≈ CYA/3 at pool pH, so raw TA overstates
// the carbonate buffer. Interpretation band: −0.3 … +0.3 [S7].
// ──────────────────────────────────────────────────────────────────────
import type { SanitizerType } from './targets';

export interface SaturationInput {
	ph: number;
	/** total alkalinity, ppm as CaCO₃ */
	taPpm: number;
	/** calcium hardness, ppm as CaCO₃ */
	chPpm: number;
	temperatureC: number;
	/** stabiliser ppm — 0 if unknown (correction then vanishes) */
	cyaPpm: number;
	tdsPpm: number;
}

export type SaturationVerdict = 'corrosive' | 'balanced' | 'scaling';

export interface SaturationAssessment {
	value: number;
	verdict: SaturationVerdict;
}

/** TDS ≈ salt + ~1000; SWG pools carry ~3,200 ppm salt, others default 500 (spec §4) */
export function defaultTdsPpm(sanitizer: SanitizerType): number {
	return sanitizer === 'swg' ? 4200 : 500;
}

/** carbonate alkalinity = TA − cyanurate contribution (≈ CYA/3 at pH ~7.5) [S8] */
export function carbonateAlkalinityPpm(taPpm: number, cyaPpm: number): number {
	return Math.max(taPpm - cyaPpm / 3, 1);
}

export function computeSaturationIndex(input: SaturationInput): number {
	const factorA = (Math.log10(Math.max(input.tdsPpm, 1)) - 1) / 10;
	const factorB = -13.12 * Math.log10(input.temperatureC + 273) + 34.55;
	const factorC = Math.log10(Math.max(input.chPpm, 1)) - 0.4;
	const factorD = Math.log10(carbonateAlkalinityPpm(input.taPpm, input.cyaPpm));
	const phOfSaturation = 9.3 + factorA + factorB - (factorC + factorD);
	return input.ph - phOfSaturation;
}

const SATURATION_BALANCED_LIMIT = 0.3;

export function saturationVerdict(indexValue: number): SaturationVerdict {
	if (indexValue < -SATURATION_BALANCED_LIMIT) return 'corrosive';
	if (indexValue > SATURATION_BALANCED_LIMIT) return 'scaling';
	return 'balanced';
}

export function assessSaturation(input: SaturationInput): SaturationAssessment {
	const value = computeSaturationIndex(input);
	return { value, verdict: saturationVerdict(value) };
}
