import { describe, expect, it } from 'vitest';
import { buildTrends } from './trends';
import type { DisplayUnits } from './chemistry';
import type { TestRow } from './db/schema';

const METRIC: DisplayUnits = { hardnessUnit: '°fH', temperatureUnit: '°C' };
const PPM: DisplayUnits = { hardnessUnit: 'ppm', temperatureUnit: '°C' };

const day = (offset: number) => new Date(2024, 4, 1 + offset);

// only the parameters under test are set; everything else stays null (un-measured)
function row(testedAt: Date, overrides: Partial<TestRow>): TestRow {
	return {
		id: 0,
		testedAt,
		tester: 't',
		ph: null,
		freeChlorine: null,
		totalAlkalinity: null,
		totalAlkalinityUnit: 'ppm',
		calciumHardness: null,
		calciumHardnessUnit: 'ppm',
		cyanuricAcid: null,
		temperature: null,
		...overrides
	};
}

const phTrend = (rows: TestRow[], units: DisplayUnits = METRIC) =>
	buildTrends(rows, units).find((trend) => trend.key === 'ph')!;

describe('buildTrends — inclusion rules', () => {
	it('returns nothing for no tests', () => {
		expect(buildTrends([], METRIC)).toEqual([]);
	});

	it('never charts temperature', () => {
		const trends = buildTrends(
			[row(day(0), { temperature: 20 }), row(day(1), { temperature: 30 })],
			METRIC
		);
		expect(trends).toEqual([]);
	});

	it('skips parameters with no readings and keeps those that have them', () => {
		const trends = buildTrends([row(day(0), { ph: 7.2 }), row(day(1), { ph: 7.4 })], METRIC);
		expect(trends.map((trend) => trend.key)).toEqual(['ph']);
	});
});

describe('buildTrends — direction', () => {
	it('is flat with a single reading', () => {
		const trend = phTrend([row(day(0), { ph: 7.4 })]);
		expect(trend.direction).toBe('flat');
		expect(trend.points).toHaveLength(1);
	});

	it('is flat when the move is under the threshold', () => {
		// (7.45-7.40)/(8.2-6.8) ≈ 0.036 of scale, below the 0.08 threshold
		expect(phTrend([row(day(0), { ph: 7.4 }), row(day(1), { ph: 7.45 })]).direction).toBe('flat');
	});

	it('detects a clear rise and fall', () => {
		expect(phTrend([row(day(0), { ph: 6.9 }), row(day(1), { ph: 8.1 })]).direction).toBe('up');
		expect(phTrend([row(day(0), { ph: 8.1 }), row(day(1), { ph: 6.9 })]).direction).toBe('down');
	});
});

describe('buildTrends — series & stats (oldest-first input)', () => {
	it('keeps points oldest-first and reports the latest as "now"', () => {
		const trend = phTrend([
			row(day(0), { ph: 7.0 }),
			row(day(1), { ph: 7.2 }),
			row(day(2), { ph: 7.6 })
		]);
		expect(trend.points[0]).toBeLessThan(trend.points[2]);
		expect(trend.latestDisplay).toBe('7.6');
		expect(trend.lowDisplay).toBe('7.0');
		expect(trend.highDisplay).toBe('7.6');
		expect(trend.avgDisplay).toBe('7.3'); // (7.0+7.2+7.6)/3 = 7.2667
		expect(trend.dates).toHaveLength(3);
	});
});

describe('buildTrends — display units affect numbers, not direction', () => {
	it('reports alkalinity in the active hardness unit but trends on the canonical value', () => {
		const rows = [row(day(0), { totalAlkalinity: 80 }), row(day(1), { totalAlkalinity: 120 })];
		const inFrench = buildTrends(rows, METRIC).find((trend) => trend.key === 'ta')!;
		const inPpm = buildTrends(rows, PPM).find((trend) => trend.key === 'ta')!;
		expect(inFrench.latestDisplay).toBe('12'); // 120 ppm → 12 °fH
		expect(inPpm.latestDisplay).toBe('120');
		expect(inFrench.direction).toBe('up');
		expect(inPpm.direction).toBe(inFrench.direction);
	});
});
