import { describe, expect, it } from 'vitest';
import {
	hardnessFromPpm,
	hardnessToPpm,
	temperatureFromCelsius,
	LITRES_PER_VOLUME_UNIT
} from './units';
import { volumeToCubicMetres } from './fixPlan';

describe('hardness conversions', () => {
	it('converts French degrees to ppm and back', () => {
		expect(hardnessToPpm(10, '°fH')).toBe(100);
		expect(hardnessFromPpm(100, '°fH')).toBe(10);
	});

	it('converts German degrees to ppm and back', () => {
		expect(hardnessToPpm(10, '°dH')).toBeCloseTo(178, 5);
		expect(hardnessFromPpm(178, '°dH')).toBeCloseTo(10, 5);
	});

	it('treats ppm as identity', () => {
		expect(hardnessToPpm(240, 'ppm')).toBe(240);
		expect(hardnessFromPpm(240, 'ppm')).toBe(240);
	});

	it('round-trips through every unit', () => {
		for (const unit of ['ppm', '°fH', '°dH'] as const) {
			expect(hardnessFromPpm(hardnessToPpm(42, unit), unit)).toBeCloseTo(42, 10);
		}
	});
});

describe('temperature conversions', () => {
	it('converts °C to °F', () => {
		expect(temperatureFromCelsius(26, '°F')).toBeCloseTo(78.8, 5);
		expect(temperatureFromCelsius(0, '°F')).toBe(32);
	});

	it('leaves °C untouched', () => {
		expect(temperatureFromCelsius(26, '°C')).toBe(26);
	});
});

describe('volume conversions', () => {
	it('distinguishes US and imperial gallons', () => {
		expect(LITRES_PER_VOLUME_UNIT['US gal']).toBe(3.785);
		expect(LITRES_PER_VOLUME_UNIT['imp gal']).toBe(4.546);
	});

	it('converts 10,000 imperial gallons to 45.46 m³', () => {
		expect(volumeToCubicMetres('10,000', 'imp gal')).toBeCloseTo(45.46, 2);
	});

	it('converts 10,000 US gallons to 37.85 m³', () => {
		expect(volumeToCubicMetres('10,000', 'US gal')).toBeCloseTo(37.85, 2);
	});

	it('handles litres and cubic metres', () => {
		expect(volumeToCubicMetres('50,000', 'litres')).toBe(50);
		expect(volumeToCubicMetres('50', 'm³')).toBe(50);
	});

	it('treats unparseable volume as zero', () => {
		expect(volumeToCubicMetres('', 'litres')).toBe(0);
	});
});
