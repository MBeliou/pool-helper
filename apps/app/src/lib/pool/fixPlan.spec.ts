// Pins the fixPlan-side context plumbing: mapping raw test rows into the
// engine's history context, and the strips reliability hint. No DB involved —
// plain objects shaped like TestRow.
import { describe, expect, it } from 'vitest';
import { computeFixPlan, guidanceContextFromHistory, type PoolGuidanceProfile } from './fixPlan';
import type { TestRow } from './db/schema';

const PROFILE: PoolGuidanceProfile = {
	volume: 30_000,
	volumeUnit: 'litres',
	hardnessUnit: 'ppm',
	surface: 'Plaster',
	sanitiser: 'Chlorine',
	location: 'Outdoor',
	sunExposure: 'Full sun'
};

function testRow(partial: Partial<TestRow> & { id: number; testedAt: Date }): TestRow {
	return {
		tester: 'Drop test kit',
		ph: null,
		freeChlorine: null,
		totalChlorine: null,
		totalAlkalinity: null,
		totalAlkalinityUnit: 'ppm',
		calciumHardness: null,
		calciumHardnessUnit: 'ppm',
		cyanuricAcid: null,
		temperature: null,
		...partial
	};
}

const LATEST = testRow({
	id: 3,
	testedAt: new Date('2026-07-15T18:00:00Z'),
	freeChlorine: 2.0,
	totalChlorine: 3.6,
	ph: 7.4,
	totalAlkalinity: 80,
	calciumHardness: 300,
	cyanuricAcid: 40,
	temperature: 26
});

describe('guidanceContextFromHistory', () => {
	it('anchors on the latest test and maps priors to fc/tc/testedAt', () => {
		const priorTest = testRow({
			id: 1,
			testedAt: new Date('2026-07-13T18:00:00Z'),
			freeChlorine: 2.5,
			totalChlorine: 3.8
		});
		const context = guidanceContextFromHistory(LATEST, { recentTests: [priorTest, LATEST] });
		expect(context.testedAt).toEqual(LATEST.testedAt);
		expect(context.priorTests).toEqual([
			{ testedAt: priorTest.testedAt, fc: 2.5, tc: 3.8 }
		]);
	});

	it('excludes the latest row itself and any test taken after it', () => {
		const laterTest = testRow({
			id: 4,
			testedAt: new Date('2026-07-16T18:00:00Z'),
			freeChlorine: 3,
			totalChlorine: 4
		});
		const context = guidanceContextFromHistory(LATEST, { recentTests: [LATEST, laterTest] });
		expect(context.priorTests).toEqual([]);
	});
});

describe('computeFixPlan testerHint', () => {
	const strips = { name: 'Test strips', type: 'strips' as const };
	const drops = { name: 'Drop test kit', type: 'drops' as const };

	it('surfaces the hint when the latest test used strips', () => {
		const stripTest = { ...LATEST, tester: 'Test strips' };
		const plan = computeFixPlan(stripTest, PROFILE, { storedTesters: [strips, drops] });
		expect(plan.testerHint).toMatch(/strips/i);
	});

	it('stays quiet for a drop kit', () => {
		const plan = computeFixPlan(LATEST, PROFILE, { storedTesters: [strips, drops] });
		expect(plan.testerHint).toBeNull();
	});

	it('falls back to strips (the conservative kind) for an unknown tester name', () => {
		const unknownTest = { ...LATEST, tester: 'Some custom kit' };
		const plan = computeFixPlan(unknownTest, PROFILE, { storedTesters: [strips, drops] });
		expect(plan.testerHint).toMatch(/strips/i);
	});

	it('stays quiet when no tester context was supplied at all', () => {
		const plan = computeFixPlan(LATEST, PROFILE);
		expect(plan.testerHint).toBeNull();
	});
});
