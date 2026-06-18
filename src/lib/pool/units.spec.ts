import { describe, expect, it } from 'vitest';
import {
	hardnessFromPpm,
	hardnessToPpm,
	temperatureFromCelsius,
	LITRES_PER_VOLUME_UNIT,
	convertVolume,
	roundVolumeForUnit
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
		expect(volumeToCubicMetres(10000, 'imp gal')).toBeCloseTo(45.46, 2);
	});

	it('converts 10,000 US gallons to 37.85 m³', () => {
		expect(volumeToCubicMetres(10000, 'US gal')).toBeCloseTo(37.85, 2);
	});

	it('handles litres and cubic metres', () => {
		expect(volumeToCubicMetres(50000, 'litres')).toBe(50);
		expect(volumeToCubicMetres(50, 'm³')).toBe(50);
	});

	it('preserves fractional cubic metres', () => {
		expect(volumeToCubicMetres(9.7, 'm³')).toBeCloseTo(9.7, 5);
	});

	it('treats a null volume as zero', () => {
		expect(volumeToCubicMetres(null, 'litres')).toBe(0);
	});
});

describe('roundVolumeForUnit', () => {
	it('keeps one decimal for m³, whole numbers otherwise', () => {
		expect(roundVolumeForUnit(9.74, 'm³')).toBe(9.7);
		expect(roundVolumeForUnit(13210.4, 'litres')).toBe(13210);
		expect(roundVolumeForUnit(5283.6, 'US gal')).toBe(5284);
	});
});

describe('convertVolume — preserves physical size on unit change', () => {
	it('is identity for the same unit', () => {
		expect(convertVolume(9.7, 'm³', 'm³')).toBe(9.7);
	});

	it('converts litres ↔ m³ symmetrically', () => {
		expect(convertVolume(50000, 'litres', 'm³')).toBe(50);
		expect(convertVolume(50, 'm³', 'litres')).toBe(50000);
		expect(convertVolume(9.7, 'm³', 'litres')).toBe(9700);
	});

	it('converts gallons to litres', () => {
		expect(convertVolume(10000, 'imp gal', 'litres')).toBe(45460);
		expect(convertVolume(10000, 'US gal', 'litres')).toBe(37850);
	});
});
