import { describe, expect, it } from 'vitest';
import {
	DOSING_PRODUCTS,
	computeDose,
	formatDoseAmount,
	type DoseRequest,
	type DosingProduct
} from './dosing';
import { hardnessToPpm, LITRES_PER_VOLUME_UNIT } from './units';

const TEN_THOUSAND_US_GALLONS_LITRES = 10_000 * LITRES_PER_VOLUME_UNIT['US gal']; // 37,850 L

function doseAmount(
	request: DoseRequest,
	product: DosingProduct = DOSING_PRODUCTS.calHypo
): number {
	const result = computeDose(request, product);
	if (!result) throw new Error('expected a dose');
	return result.amount;
}

describe('golden values — stoichiometric (cited in DOSING_BASIS)', () => {
	const raiseFcBy4: DoseRequest = {
		parameter: 'fc',
		currentValue: 0,
		targetValue: 4,
		poolVolumeLitres: TEN_THOUSAND_US_GALLONS_LITRES
	};

	it('Cal-Hypo 65%: +4 ppm FC in 10,000 US gal ≈ 233 g', () => {
		expect(doseAmount(raiseFcBy4, DOSING_PRODUCTS.calHypo)).toBeCloseTo(232.9, 0);
	});

	it('liquid chlorine 12.5%: +4 ppm FC in 10,000 US gal ≈ 1.21 L', () => {
		expect(doseAmount(raiseFcBy4, DOSING_PRODUCTS.liquidChlorine)).toBeCloseTo(1211, 0);
	});

	it('Dichlor 56%: +4 ppm FC in 10,000 US gal ≈ 270 g', () => {
		expect(doseAmount(raiseFcBy4, DOSING_PRODUCTS.dichlor)).toBeCloseTo(270.4, 0);
	});

	it('baking soda: +10 ppm TA in 10,000 US gal matches the JSPSI chart (1.40 lbs ≈ 635 g)', () => {
		const grams = doseAmount(
			{
				parameter: 'ta',
				currentValue: 90,
				targetValue: 100,
				poolVolumeLitres: TEN_THOUSAND_US_GALLONS_LITRES
			},
			DOSING_PRODUCTS.bakingSoda
		);
		expect(grams).toBeCloseTo(635, -1); // JSPSI: volume/71,425 lbs per ppm
	});

	it('calcium chloride 77%: +50 ppm CH in 10,000 US gal ≈ 2.78 kg', () => {
		const grams = doseAmount(
			{
				parameter: 'ch',
				currentValue: 200,
				targetValue: 250,
				poolVolumeLitres: TEN_THOUSAND_US_GALLONS_LITRES
			},
			DOSING_PRODUCTS.calciumChloride
		);
		expect(grams).toBeCloseTo(2782, 0);
	});

	it('cyanuric acid: +30 ppm in 10,000 US gal ≈ 1.14 kg', () => {
		const grams = doseAmount(
			{
				parameter: 'cya',
				currentValue: 10,
				targetValue: 40,
				poolVolumeLitres: TEN_THOUSAND_US_GALLONS_LITRES
			},
			DOSING_PRODUCTS.cyanuricAcid
		);
		expect(grams).toBeCloseTo(1135.5, 1);
	});
});

describe('pH approximations — regression pins + published reference window', () => {
	const lowerPh: DoseRequest = {
		parameter: 'ph',
		currentValue: 7.8,
		targetValue: 7.4,
		poolVolumeLitres: TEN_THOUSAND_US_GALLONS_LITRES,
		totalAlkalinityPpm: 100
	};

	it('dry acid 7.8→7.4 @ TA 100: pinned to our basis (757 g)', () => {
		expect(doseAmount(lowerPh, DOSING_PRODUCTS.dryAcid)).toBeCloseTo(757, 0);
	});

	it('dry acid stays inside the published reference window (600–1,100 g)', () => {
		const grams = doseAmount(lowerPh, DOSING_PRODUCTS.dryAcid);
		expect(grams).toBeGreaterThan(600);
		expect(grams).toBeLessThan(1100);
	});

	it('muriatic equivalent uses the JSPSI-derived 0.785 mL/g', () => {
		const millilitres = doseAmount(lowerPh, DOSING_PRODUCTS.muriaticAcid);
		expect(millilitres).toBeCloseTo(757 * 0.785, 0);
	});

	it('soda ash 7.0→7.4 @ TA 100 in 10,000 US gal matches both cited charts (≈ 12 oz = 340 g)', () => {
		const grams = doseAmount(
			{
				parameter: 'ph',
				currentValue: 7.0,
				targetValue: 7.4,
				poolVolumeLitres: TEN_THOUSAND_US_GALLONS_LITRES,
				totalAlkalinityPpm: 100
			},
			DOSING_PRODUCTS.sodaAsh
		);
		expect(grams).toBeCloseTo(340.65, 1); // 12 oz = 340 g chart value, exact at our constant
	});

	it('acid demand scales with alkalinity and clamps outside 50–180 ppm', () => {
		const at = (totalAlkalinityPpm: number) =>
			doseAmount({ ...lowerPh, totalAlkalinityPpm }, DOSING_PRODUCTS.dryAcid);
		expect(at(120) / at(60)).toBeCloseTo(2, 5);
		expect(at(40)).toBeCloseTo(at(50), 5); // clamped low
		expect(at(400)).toBeCloseTo(at(180), 5); // clamped high
	});

	it('pH dose without an alkalinity reading is refused', () => {
		expect(
			computeDose({ ...lowerPh, totalAlkalinityPpm: undefined }, DOSING_PRODUCTS.dryAcid)
		).toBeNull();
	});
});

describe('properties of the canonical computation', () => {
	const base: DoseRequest = {
		parameter: 'fc',
		currentValue: 1,
		targetValue: 3,
		poolVolumeLitres: 50_000
	};

	it('is linear in volume', () => {
		expect(doseAmount({ ...base, poolVolumeLitres: 100_000 })).toBeCloseTo(2 * doseAmount(base), 6);
	});

	it('is linear in delta', () => {
		expect(doseAmount({ ...base, targetValue: 5 })).toBeCloseTo(2 * doseAmount(base), 6);
	});

	it('refuses zero, negative and wrong-direction deltas', () => {
		expect(computeDose({ ...base, targetValue: 1 }, DOSING_PRODUCTS.calHypo)).toBeNull();
		expect(computeDose({ ...base, targetValue: 0.5 }, DOSING_PRODUCTS.calHypo)).toBeNull();
	});

	it('refuses disabled products and parameter mismatches', () => {
		expect(computeDose(base, DOSING_PRODUCTS.trichlorTabs)).toBeNull();
		expect(computeDose(base, DOSING_PRODUCTS.bakingSoda)).toBeNull();
	});
});

describe('boundary round-trips (canonicalization is unit-independent)', () => {
	it('the same pool entered in litres, US gal and imp gal doses identically', () => {
		const litres = 45_460;
		const fromUsGallons =
			(litres / LITRES_PER_VOLUME_UNIT['US gal']) * LITRES_PER_VOLUME_UNIT['US gal'];
		const fromImperial =
			(litres / LITRES_PER_VOLUME_UNIT['imp gal']) * LITRES_PER_VOLUME_UNIT['imp gal'];
		const request = (poolVolumeLitres: number): DoseRequest => ({
			parameter: 'fc',
			currentValue: 0.8,
			targetValue: 3,
			poolVolumeLitres
		});
		expect(doseAmount(request(fromUsGallons))).toBeCloseTo(doseAmount(request(litres)), 6);
		expect(doseAmount(request(fromImperial))).toBeCloseTo(doseAmount(request(litres)), 6);
	});

	it('TA entered in °fH doses the same as its ppm equivalent', () => {
		const request = (totalAlkalinityPpm: number): DoseRequest => ({
			parameter: 'ph',
			currentValue: 7.8,
			targetValue: 7.4,
			poolVolumeLitres: 50_000,
			totalAlkalinityPpm
		});
		expect(doseAmount(request(hardnessToPpm(9, '°fH')), DOSING_PRODUCTS.dryAcid)).toBeCloseTo(
			doseAmount(request(90), DOSING_PRODUCTS.dryAcid),
			6
		);
	});
});

describe('dose formatting', () => {
	it('formats grams, kilograms, millilitres and litres', () => {
		expect(formatDoseAmount({ product: DOSING_PRODUCTS.calHypo, amount: 680, unit: 'g' })).toBe(
			'Add 680 g'
		);
		expect(formatDoseAmount({ product: DOSING_PRODUCTS.calHypo, amount: 1690, unit: 'g' })).toBe(
			'Add 1.7 kg'
		);
		expect(
			formatDoseAmount({ product: DOSING_PRODUCTS.muriaticAcid, amount: 594, unit: 'mL' })
		).toBe('Add 594 mL');
		expect(
			formatDoseAmount({ product: DOSING_PRODUCTS.liquidChlorine, amount: 1211, unit: 'mL' })
		).toBe('Add 1.2 L');
	});
});
