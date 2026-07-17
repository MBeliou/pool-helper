// Pins each demo scenario to the engine behaviour it exists to demonstrate:
// if a scenario's readings or the engine's targets drift apart, this fails
// before anyone taps a stale Developer button.
import { describe, expect, it } from 'vitest';
import {
	DEMO_BASE_POOL,
	GUIDANCE_SCENARIO_DEFINITIONS,
	latestReadings,
	type GuidanceScenarioDefinition
} from './demoScenarios';
import { guidanceConfigFromProfile, type PoolGuidanceProfile } from '../fixPlan';
import { runGuidance, type GuidanceResult } from '../guidance/engine';

function scenario(id: string): GuidanceScenarioDefinition {
	const definition = GUIDANCE_SCENARIO_DEFINITIONS.find((candidate) => candidate.id === id);
	if (!definition) throw new Error(`no scenario ${id}`);
	return definition;
}

function guidanceFor(definition: GuidanceScenarioDefinition): GuidanceResult {
	const profile = { ...DEMO_BASE_POOL, ...definition.profile } as PoolGuidanceProfile;
	return runGuidance(latestReadings(definition), guidanceConfigFromProfile(profile));
}

describe('demo scenarios reproduce their engine outcomes', () => {
	it('cya-zero: stabiliser root cause, FC wont-hold, temp requested', () => {
		const result = guidanceFor(scenario('cya-zero'));
		expect(result.rootCause).toBe('cya');
		expect(result.actions[0]?.parameter).toBe('cya');
		expect(result.verdicts.find((verdict) => verdict.parameter === 'fc')?.status).toBe('wont-hold');
		expect(result.requestInput.some((request) => request.parameter === 'temp')).toBe(true);
	});

	it('high-ta: single acid action, TA deferred, TA root cause', () => {
		const result = guidanceFor(scenario('high-ta'));
		expect(result.rootCause).toBe('ta');
		expect(result.actions).toHaveLength(1);
		expect(result.actions[0].parameter).toBe('ph');
		expect(result.actions[0].direction).toBe('lower');
		expect(result.deferred.some((entry) => entry.parameter === 'ta')).toBe(true);
	});

	it('corrosive: saturation index corrosive, raise calcium', () => {
		const result = guidanceFor(scenario('corrosive'));
		expect(result.saturation?.verdict).toBe('corrosive');
		expect(result.rootCause).toBe('ch');
		const calciumAction = result.actions.find((action) => action.parameter === 'ch');
		expect(calciumAction?.direction).toBe('raise');
	});

	it('bromine-low: safety raise, no CYA involvement', () => {
		const result = guidanceFor(scenario('bromine-low'));
		const bromineAction = result.actions.find((action) => action.parameter === 'fc');
		expect(bromineAction?.priority).toBe(0);
		expect(bromineAction?.title).toBe('Raise bromine now');
		expect(result.actions.some((action) => action.parameter === 'cya')).toBe(false);
		expect(result.verdicts.find((verdict) => verdict.parameter === 'fc')?.status).toBe('low');
	});

	it('swg-nudge: exactly one action — the cell-output nudge', () => {
		const result = guidanceFor(scenario('swg-nudge'));
		expect(result.actions).toHaveLength(1);
		expect(result.actions[0].kind).toBe('swg-output');
		expect(result.actions[0].parameter).toBe('fc');
	});

	it('smelly-water: high combined chlorine triggers the shock action', () => {
		const result = guidanceFor(scenario('smelly-water'));
		expect(result.combinedChlorine).toBeCloseTo(2.5, 5);
		expect(result.actions[0]?.title).toBe('Shock to clear used-up chlorine');
	});

	it('safety-floor: emergency chlorine raise despite unknown CYA', () => {
		const result = guidanceFor(scenario('safety-floor'));
		expect(result.actions[0]?.title).toBe('Raise chlorine now');
		expect(result.actions[0]?.priority).toBe(0);
		expect(result.requestInput.some((request) => request.parameter === 'cya')).toBe(true);
	});

	it('every scenario has a unique deep-link slug', () => {
		const slugs = GUIDANCE_SCENARIO_DEFINITIONS.map((definition) => definition.id);
		expect(new Set(slugs).size).toBe(slugs.length);
	});
});
