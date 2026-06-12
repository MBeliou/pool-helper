// Pool volume estimation from dimensions — industry-standard shape multipliers.
// All approximations: real pools have sloped floors and rounded corners; the
// average-depth input is doing most of the work.
import type { VolumeUnit } from './units';

// fraction of the bounding box (length × width × average depth) that holds water
export const SHAPE_VOLUME_FACTORS: Record<string, number> = {
	Rectangle: 1.0,
	Oval: 0.785, // π/4 — exact for a true ellipse
	Round: 0.785, // π/4 — length and width are the diameter
	Kidney: 0.76, // common industry approximation (0.45 × (A+B) rule of thumb)
	'L-shape': 0.85,
	Freeform: 0.85
};

const METRES_PER_FOOT = 0.3048;

/** dimension unit follows the volume-unit family: metres for metric, feet for gallons */
export function dimensionUnitFor(volumeUnit: VolumeUnit): 'm' | 'ft' {
	return volumeUnit === 'US gal' || volumeUnit === 'imp gal' ? 'ft' : 'm';
}

export interface PoolDimensions {
	length: number;
	width: number;
	averageDepth: number;
	unit: 'm' | 'ft';
	shape: string;
}

/** litres held by a pool of the given dimensions; null when inputs are unusable */
export function estimatePoolVolumeLitres(dimensions: PoolDimensions): number | null {
	const { length, width, averageDepth, unit, shape } = dimensions;
	if (!(length > 0) || !(width > 0) || !(averageDepth > 0)) return null;
	const toMetres = unit === 'ft' ? METRES_PER_FOOT : 1;
	const cubicMetres =
		length *
		toMetres *
		(width * toMetres) *
		(averageDepth * toMetres) *
		(SHAPE_VOLUME_FACTORS[shape] ?? SHAPE_VOLUME_FACTORS.Freeform);
	return cubicMetres * 1000;
}
