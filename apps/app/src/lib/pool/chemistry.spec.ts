import { describe, expect, it } from 'vitest';
import {
	parameterByKey,
	testValue,
	readingStatus,
	scaleFraction,
	displayValue,
	displayUnitText,
	formatReading,
	gaugeReadings,
	PARAMETERS,
	type DisplayUnits
} from './chemistry';
import type { TestRow } from './db/schema';

const METRIC: DisplayUnits = { hardnessUnit: '°fH', temperatureUnit: '°C' };
const PPM: DisplayUnits = { hardnessUnit: 'ppm', temperatureUnit: '°C' };
const IMPERIAL: DisplayUnits = { hardnessUnit: 'ppm', temperatureUnit: '°F' };

function makeTest(overrides: Partial<TestRow> = {}): TestRow {
	return {
		id: 1,
		testedAt: new Date('2024-05-28T09:00:00Z'),
		tester: 'AquaChek 7-in-1',
		ph: 7.4,
		freeChlorine: 3,
		totalAlkalinity: 100,
		totalAlkalinityUnit: 'ppm',
		calciumHardness: 250,
		calciumHardnessUnit: 'ppm',
		cyanuricAcid: 40,
		temperature: 28,
		...overrides
	};
}

const ph = parameterByKey.ph;
const fc = parameterByKey.fc;
const ta = parameterByKey.ta;
const temp = parameterByKey.temp;

describe('testValue — the single normalization point', () => {
	it('returns raw canonical values for pH, FC, CYA and temperature', () => {
		const t = makeTest({ ph: 7.4, freeChlorine: 2.5, cyanuricAcid: 45, temperature: 26 });
		expect(testValue(t, 'ph')).toBe(7.4);
		expect(testValue(t, 'fc')).toBe(2.5);
		expect(testValue(t, 'cya')).toBe(45);
		expect(testValue(t, 'temp')).toBe(26);
	});

	it('converts alkalinity/hardness to ppm using the stored unit', () => {
		expect(testValue(makeTest({ totalAlkalinity: 9, totalAlkalinityUnit: '°fH' }), 'ta')).toBe(90);
		expect(
			testValue(makeTest({ calciumHardness: 10, calciumHardnessUnit: '°dH' }), 'ch')
		).toBeCloseTo(178, 6);
		expect(testValue(makeTest({ totalAlkalinity: 100, totalAlkalinityUnit: 'ppm' }), 'ta')).toBe(
			100
		);
	});

	it('returns null for un-entered alkalinity/hardness', () => {
		expect(testValue(makeTest({ totalAlkalinity: null }), 'ta')).toBeNull();
		expect(testValue(makeTest({ calciumHardness: null }), 'ch')).toBeNull();
	});
});

describe('readingStatus — ideal-band classification', () => {
	it('flags below/within/above the ideal band (pH 7.2–7.6)', () => {
		expect(readingStatus(ph, 7.0)).toBe('low');
		expect(readingStatus(ph, 7.4)).toBe('ok');
		expect(readingStatus(ph, 7.9)).toBe('high');
	});

	it('treats the band edges as in-range (inclusive)', () => {
		expect(readingStatus(ph, 7.2)).toBe('ok');
		expect(readingStatus(ph, 7.6)).toBe('ok');
	});

	it('is informational for parameters without an ideal band (temperature)', () => {
		expect(readingStatus(temp, 5)).toBe('info');
		expect(readingStatus(temp, 40)).toBe('info');
	});
});

describe('scaleFraction — gauge geometry, clamped 0..1', () => {
	it('maps the scale midpoint to 0.5', () => {
		expect(scaleFraction(ph, 7.5)).toBeCloseTo(0.5, 6); // (7.5-6.8)/(8.2-6.8)
		expect(scaleFraction(fc, 3)).toBeCloseTo(0.5, 6); // 0..6
	});

	it('clamps values outside the scale', () => {
		expect(scaleFraction(fc, -10)).toBe(0);
		expect(scaleFraction(fc, 99)).toBe(1);
		expect(scaleFraction(fc, 0)).toBe(0);
		expect(scaleFraction(fc, 6)).toBe(1);
	});
});

describe('displayValue / displayUnitText — canonical → display units', () => {
	it('converts alkalinity & hardness into the active hardness unit', () => {
		expect(displayValue(ta, 100, METRIC)).toBe(10); // 100 ppm → 10 °fH
		expect(displayValue(ta, 100, PPM)).toBe(100);
		expect(displayValue(parameterByKey.ch, 250, METRIC)).toBe(25);
	});

	it('converts temperature into the active temperature unit', () => {
		expect(displayValue(temp, 28, IMPERIAL)).toBeCloseTo(82.4, 6);
		expect(displayValue(temp, 28, METRIC)).toBe(28);
	});

	it('passes pH/FC/CYA through unchanged', () => {
		expect(displayValue(ph, 7.4, METRIC)).toBe(7.4);
		expect(displayValue(fc, 3, METRIC)).toBe(3);
	});

	it('labels units correctly (blank for pH, ppm for FC/CYA, unit for ta/ch/temp)', () => {
		expect(displayUnitText(ph, METRIC)).toBe('');
		expect(displayUnitText(fc, METRIC)).toBe('ppm');
		expect(displayUnitText(parameterByKey.cya, METRIC)).toBe('ppm');
		expect(displayUnitText(ta, METRIC)).toBe('°fH');
		expect(displayUnitText(temp, IMPERIAL)).toBe('°F');
	});
});

describe('formatReading', () => {
	it('respects the parameter decimal places', () => {
		expect(formatReading(7.44, 1)).toBe('7.4');
		expect(formatReading(100.6, 0)).toBe('101');
	});
});

describe('gaugeReadings — Home gauge model', () => {
	it('renders an em dash with zero fill for every parameter when no test exists', () => {
		const readings = gaugeReadings(undefined, METRIC);
		expect(readings).toHaveLength(PARAMETERS.length);
		expect(readings.every((reading) => reading.value === '—')).toBe(true);
		expect(readings.every((reading) => reading.status === 'info')).toBe(true);
		expect(readings.every((reading) => reading.fraction === 0)).toBe(true);
	});

	it('formats measured values, statuses and display units from a test', () => {
		const readings = gaugeReadings(
			makeTest({ ph: 7.4, totalAlkalinity: 90, totalAlkalinityUnit: 'ppm', temperature: 28 }),
			METRIC
		);
		const phReading = readings.find((reading) => reading.key === 'ph')!;
		const taReading = readings.find((reading) => reading.key === 'ta')!;
		const tempReading = readings.find((reading) => reading.key === 'temp')!;
		expect(phReading.value).toBe('7.4');
		expect(phReading.status).toBe('ok');
		expect(taReading.value).toBe('9'); // 90 ppm → 9 °fH
		expect(taReading.unit).toBe('°fH');
		expect(tempReading.status).toBe('info'); // no ideal band
	});
});
