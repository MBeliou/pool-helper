import { describe, expect, it } from 'vitest';
import { dimensionUnitFor, estimatePoolVolumeLitres } from './volumeCalculator';

describe('pool volume estimation', () => {
	it('10 m × 5 m × 1.5 m rectangle holds 75,000 L', () => {
		expect(
			estimatePoolVolumeLitres({
				length: 10,
				width: 5,
				averageDepth: 1.5,
				unit: 'm',
				shape: 'Rectangle'
			})
		).toBeCloseTo(75_000, 0);
	});

	it('applies the π/4 factor for round pools', () => {
		expect(
			estimatePoolVolumeLitres({
				length: 4,
				width: 4,
				averageDepth: 1.2,
				unit: 'm',
				shape: 'Round'
			})
		).toBeCloseTo(4 * 4 * 1.2 * 0.785 * 1000, 0);
	});

	it('converts feet to metres', () => {
		const metric = estimatePoolVolumeLitres({
			length: 10,
			width: 5,
			averageDepth: 1.5,
			unit: 'm',
			shape: 'Rectangle'
		});
		const imperial = estimatePoolVolumeLitres({
			length: 10 / 0.3048,
			width: 5 / 0.3048,
			averageDepth: 1.5 / 0.3048,
			unit: 'ft',
			shape: 'Rectangle'
		});
		expect(imperial).toBeCloseTo(metric ?? 0, 4);
	});

	it('rejects unusable dimensions', () => {
		expect(
			estimatePoolVolumeLitres({ length: 0, width: 5, averageDepth: 1.5, unit: 'm', shape: 'Oval' })
		).toBeNull();
	});

	it('dimension unit follows the volume-unit family', () => {
		expect(dimensionUnitFor('litres')).toBe('m');
		expect(dimensionUnitFor('m³')).toBe('m');
		expect(dimensionUnitFor('US gal')).toBe('ft');
		expect(dimensionUnitFor('imp gal')).toBe('ft');
	});
});
