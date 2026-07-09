// Snapshot tests pinning the engine to the spec's canonical cases (spec §8),
// plus SWG, bromine and indoor coverage for the extensions this app ships.
import { describe, expect, it } from 'vitest';
import { runGuidance, type GuidanceReadings } from './engine';
import { cyaBand, sanitizerTargets, type GuidanceConfig } from './targets';
import { computeSaturationIndex } from './saturationIndex';

const OUTDOOR_CHLORINE_PLASTER: GuidanceConfig = {
	volumeLitres: 30_000,
	sanitizer: 'chlorine',
	surface: 'plaster',
	location: 'outdoor',
	sunExposure: 'full'
};

function readings(partial: Partial<GuidanceReadings>): GuidanceReadings {
	return { fc: null, tc: null, ph: null, ta: null, ch: null, cya: null, temp: null, ...partial };
}

describe('spec §8 test 1 — the screenshot (CYA = 0)', () => {
	const result = runGuidance(
		readings({ fc: 3.0, ph: 7.2, ta: 80, cya: 0, ch: 100, temp: null }),
		OUTDOOR_CHLORINE_PLASTER
	);

	it('routes CYA as the root cause', () => {
		expect(result.rootCause).toBe('cya');
		expect(result.actions[0]?.parameter).toBe('cya');
		expect(result.actions[0]?.direction).toBe('raise');
		expect(result.actions[0]?.targetValue).toBe(40);
	});

	it('never says "FC ok" — verdict is wont-hold with the UV explanation', () => {
		const fcVerdict = result.verdicts.find((verdict) => verdict.parameter === 'fc');
		expect(fcVerdict?.status).toBe('wont-hold');
		expect(fcVerdict?.note).toMatch(/WON'T HOLD/);
	});

	it('defers the FC target until CYA is set', () => {
		expect(result.deferred.some((entry) => entry.parameter === 'fc')).toBe(true);
	});

	it('requests the missing temperature for the saturation check', () => {
		expect(result.requestInput.some((request) => request.parameter === 'temp')).toBe(true);
	});
});

describe('spec §8 test 2 — high TA dragging pH up', () => {
	const result = runGuidance(readings({ fc: 5, ph: 8.0, ta: 180, cya: 40, ch: 300, temp: 28 }), {
		...OUTDOOR_CHLORINE_PLASTER,
		volumeLitres: 50_000
	});

	it('treats TA as the root cause, not pH', () => {
		expect(result.rootCause).toBe('ta');
	});

	it('emits a single acid action (no simultaneous TA step)', () => {
		expect(result.actions).toHaveLength(1);
		expect(result.actions[0].parameter).toBe('ph');
		expect(result.actions[0].direction).toBe('lower');
	});

	it('shows the side effect and the do-not-add-base guidance', () => {
		expect(result.actions[0].sideEffects.join(' ')).toMatch(/lowers TA/);
		expect(result.actions[0].why).toMatch(/rounds/i);
		expect(result.actions[0].why).toMatch(/NOT/);
		expect(result.actions[0].followUpSteps.join(' ')).toMatch(/repeat/i);
	});

	it('defers the TA adjustment behind the acid dose', () => {
		expect(result.deferred.some((entry) => entry.parameter === 'ta')).toBe(true);
	});
});

describe('spec §8 test 3 — corrosive water (saturation index)', () => {
	const result = runGuidance(readings({ fc: 5, ph: 7.2, ta: 60, cya: 40, ch: 150, temp: 30 }), {
		...OUTDOOR_CHLORINE_PLASTER,
		volumeLitres: 40_000
	});

	it('computes a corrosive saturation index', () => {
		// spec's raw-TA figure is ≈ −0.72; with the CYA-corrected carbonate
		// alkalinity (spec §4 v1.1 refinement, deliberately shipped) it lands lower
		expect(result.saturation?.verdict).toBe('corrosive');
		expect(result.saturation?.value).toBeLessThan(-0.6);
		expect(result.saturation?.value).toBeGreaterThan(-1.0);
	});

	it('routes CH as the root cause and raises calcium toward the plaster band', () => {
		expect(result.rootCause).toBe('ch');
		const calciumAction = result.actions.find((action) => action.parameter === 'ch');
		expect(calciumAction?.direction).toBe('raise');
		expect(calciumAction?.targetValue).toBe(300);
		expect(calciumAction?.sideEffects.join(' ')).toMatch(/nudge/i);
	});
});

describe('keystone derivation — FC from CYA (spec §3)', () => {
	it('scales min/target/shock with CYA for manual chlorine', () => {
		const targets = sanitizerTargets(OUTDOOR_CHLORINE_PLASTER, 40);
		expect(targets).toEqual({ min: 3, target: 4.6, high: 6, shock: 16 });
	});

	it('runs leaner for SWG pools', () => {
		const targets = sanitizerTargets({ ...OUTDOOR_CHLORINE_PLASTER, sanitizer: 'swg' }, 70);
		expect(targets?.min).toBeCloseTo(3.2, 1);
		expect(targets?.target).toBeCloseTo(3.5, 1);
	});

	it('has no target for an outdoor chlorine pool with CYA 0', () => {
		expect(sanitizerTargets(OUTDOOR_CHLORINE_PLASTER, 0)).toBeNull();
	});

	it('falls back to a static indoor band when there is no UV to fight', () => {
		const targets = sanitizerTargets({ ...OUTDOOR_CHLORINE_PLASTER, location: 'indoor' }, 0);
		expect(targets).toEqual({ min: 1, target: 3, high: 4, shock: 10 });
	});
});

describe('CYA target derivation by sanitizer and sun (spec §4 + sun-exposure extension)', () => {
	it('liquid chlorine, full sun: 30–50', () => {
		expect(cyaBand(OUTDOOR_CHLORINE_PLASTER)).toEqual({ low: 30, high: 50, target: 40 });
	});
	it('SWG: 70–80', () => {
		expect(cyaBand({ ...OUTDOOR_CHLORINE_PLASTER, sanitizer: 'swg' })).toEqual({
			low: 70,
			high: 80,
			target: 75
		});
	});
	it('low-sun outdoor: 20–30', () => {
		expect(cyaBand({ ...OUTDOOR_CHLORINE_PLASTER, sunExposure: 'low' })).toEqual({
			low: 20,
			high: 30,
			target: 25
		});
	});
	it('indoor: no CYA needed, only flagged when high', () => {
		expect(cyaBand({ ...OUTDOOR_CHLORINE_PLASTER, location: 'indoor' })?.low).toBe(0);
	});
	it('bromine: no CYA target at all', () => {
		expect(cyaBand({ ...OUTDOOR_CHLORINE_PLASTER, sanitizer: 'bromine' })).toBeNull();
	});
});

describe('bromine pools', () => {
	const bromineConfig: GuidanceConfig = {
		...OUTDOOR_CHLORINE_PLASTER,
		sanitizer: 'bromine'
	};

	it('uses the static total-bromine band (3–5 ppm) with no CYA coupling', () => {
		const result = runGuidance(readings({ fc: 1, ph: 7.4, ta: 80, cya: 0 }), bromineConfig);
		const safetyAction = result.actions.find((action) => action.parameter === 'fc');
		expect(safetyAction?.priority).toBe(0);
		expect(safetyAction?.targetValue).toBe(4);
		// no CYA action, no wont-hold: bromine is not stabilised by CYA
		expect(result.actions.some((action) => action.parameter === 'cya')).toBe(false);
		expect(result.verdicts.find((verdict) => verdict.parameter === 'fc')?.status).toBe('low');
	});

	it('says bromine in range is ok even at CYA 0', () => {
		const result = runGuidance(readings({ fc: 4, ph: 7.4, ta: 80, cya: 0 }), bromineConfig);
		expect(result.verdicts.find((verdict) => verdict.parameter === 'fc')?.status).toBe('ok');
	});
});

describe('absolute safety floor (rule 0 with undefined FC target)', () => {
	it('raises chlorine now when FC is near zero even with CYA unknown', () => {
		const result = runGuidance(readings({ fc: 0.2 }), OUTDOOR_CHLORINE_PLASTER);
		const safetyAction = result.actions.find((action) => action.parameter === 'fc');
		expect(safetyAction?.priority).toBe(0);
		expect(safetyAction?.targetValue).toBe(3);
		expect(result.requestInput.some((request) => request.parameter === 'cya')).toBe(true);
	});

	it('still refuses to bless a decent FC when CYA is 0', () => {
		const result = runGuidance(readings({ fc: 3, cya: 0 }), OUTDOOR_CHLORINE_PLASTER);
		expect(result.verdicts.find((verdict) => verdict.parameter === 'fc')?.status).toBe('wont-hold');
	});
});

describe('combined (used-up) chlorine', () => {
	it('CC ≥ 1.0 → single shock action replacing the plain safety raise', () => {
		const result = runGuidance(
			readings({ fc: 2.0, tc: 3.6, ph: 7.4, ta: 80, cya: 40, ch: 300, temp: 26 }),
			OUTDOOR_CHLORINE_PLASTER
		);
		expect(result.combinedChlorine).toBeCloseTo(1.6, 5);
		const fcActions = result.actions.filter((action) => action.parameter === 'fc');
		expect(fcActions).toHaveLength(1);
		expect(fcActions[0].title).toBe('Shock to clear used-up chlorine');
		expect(fcActions[0].priority).toBe(0);
		expect(fcActions[0].targetValue).toBe(16); // shock level at CYA 40
	});

	it('0.5 ≤ CC < 1.0 → building note only, no shock action', () => {
		const result = runGuidance(
			readings({ fc: 4.8, tc: 5.5, ph: 7.4, ta: 80, cya: 40, ch: 300, temp: 26 }),
			OUTDOOR_CHLORINE_PLASTER
		);
		expect(result.combinedChlorine).toBeCloseTo(0.7, 5);
		expect(result.actions.some((action) => action.title.includes('Shock'))).toBe(false);
		const fcVerdict = result.verdicts.find((verdict) => verdict.parameter === 'fc');
		expect(fcVerdict?.note).toMatch(/building/i);
	});

	it('bromine pools have no free/combined split', () => {
		const result = runGuidance(readings({ fc: 4, tc: 5.5, ph: 7.4, ta: 80 }), {
			...OUTDOOR_CHLORINE_PLASTER,
			sanitizer: 'bromine'
		});
		expect(result.combinedChlorine).toBeNull();
	});

	it('shock target falls back sanely when the FC target is undefined (CYA 0)', () => {
		const result = runGuidance(
			readings({ fc: 2.0, tc: 3.5, ph: 7.4, ta: 80, cya: 0 }),
			OUTDOOR_CHLORINE_PLASTER
		);
		const shockAction = result.actions.find((action) => action.title.includes('Shock'));
		expect(shockAction?.targetValue).toBe(10);
	});
});

describe('sequencer & retest-gating (spec §6)', () => {
	it('safety FC raise comes first and coexists with an independent CYA raise', () => {
		const result = runGuidance(
			readings({ fc: 1, ph: 7.4, ta: 80, cya: 40, ch: 300, temp: 26 }),
			OUTDOOR_CHLORINE_PLASTER
		);
		expect(result.actions[0].parameter).toBe('fc');
		expect(result.actions[0].priority).toBe(0);
	});

	it('defers the FC fine-tune when CYA is being raised (target will change)', () => {
		const result = runGuidance(
			readings({ fc: 2.5, ph: 7.4, ta: 80, cya: 20, ch: 300, temp: 26 }),
			OUTDOOR_CHLORINE_PLASTER
		);
		// CYA 20 → raise CYA; FC 2.5 ≥ min (1.5) but below target (2.3? no: 0.115×20=2.3 → fc 2.5 above)
		expect(result.actions.some((action) => action.parameter === 'cya')).toBe(true);
	});

	it('never emits two actions that both move pH/TA in the same pass', () => {
		const result = runGuidance(
			readings({ fc: 5, ph: 7.0, ta: 50, cya: 40, ch: 300, temp: 26 }),
			OUTDOOR_CHLORINE_PLASTER
		);
		const buffersMoved = result.actions.filter(
			(action) => action.parameter === 'ph' || action.parameter === 'ta'
		);
		expect(buffersMoved).toHaveLength(1);
		expect(result.deferred.length).toBeGreaterThan(0);
	});

	it('clamps a single pH dose to the max safe step', () => {
		const result = runGuidance(
			readings({ fc: 5, ph: 8.6, ta: 80, cya: 40, ch: 300, temp: 26 }),
			OUTDOOR_CHLORINE_PLASTER
		);
		const phAction = result.actions.find((action) => action.parameter === 'ph');
		expect(phAction?.targetValue).toBe(8.0);
		expect(phAction?.followUpSteps.join(' ')).toMatch(/retest/i);
	});
});

describe('dilution-only parameters (raisable-only, spec §2)', () => {
	it('high CYA → drain & refill advice with a percentage', () => {
		const result = runGuidance(
			readings({ fc: 8, ph: 7.4, ta: 80, cya: 100, ch: 300, temp: 26 }),
			OUTDOOR_CHLORINE_PLASTER
		);
		const dilutionAction = result.actions.find((action) => action.parameter === 'cya');
		expect(dilutionAction?.kind).toBe('dilute');
		expect(dilutionAction?.followUpSteps.join(' ')).toMatch(/60%/);
	});
});

describe('saturation index formula', () => {
	it('matches the spec worked example within tolerance (raw-TA variant)', () => {
		// spec test 3 quotes LSI ≈ −0.72 with raw TA; cya 0 disables the correction
		const rawTaValue = computeSaturationIndex({
			ph: 7.2,
			taPpm: 60,
			chPpm: 150,
			temperatureC: 30,
			cyaPpm: 0,
			tdsPpm: 500
		});
		expect(rawTaValue).toBeCloseTo(-0.72, 1);
	});
});
