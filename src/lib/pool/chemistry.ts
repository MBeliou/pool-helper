// Water-chemistry display model: scales, ideal ranges and reading normalization.
// Scales are calibrated so the design prototype's reference values reproduce
// its exact gauge geometry (e.g. pH 7.8 → fraction 0.71 on a 6.8–8.2 scale).
import type { TestRow } from './db/schema';
import type { IconName } from './icons';
import {
	hardnessFromPpm,
	hardnessToPpm,
	temperatureFromCelsius,
	type HardnessUnit,
	type TemperatureUnit
} from './units';

export type ParameterKey = 'ph' | 'fc' | 'ta' | 'ch' | 'cya' | 'temp';
export type ReadingStatus = 'ok' | 'high' | 'low' | 'info';

export interface DisplayUnits {
	hardnessUnit: HardnessUnit;
	temperatureUnit: TemperatureUnit;
}

export interface ParameterDefinition {
	key: ParameterKey;
	label: string;
	shortLabel: string;
	icon: IconName;
	/** gauge scale bounds, in canonical units (ppm, °C, pH) */
	scaleMin: number;
	scaleMax: number;
	/** ideal band in canonical units; undefined → informational only */
	idealLow?: number;
	idealHigh?: number;
	decimals: number;
}

export const PARAMETERS: ParameterDefinition[] = [
	{ key: 'ph', label: 'pH', shortLabel: 'pH', icon: 'drop', scaleMin: 6.8, scaleMax: 8.2, idealLow: 7.2, idealHigh: 7.6, decimals: 1 },
	{ key: 'fc', label: 'Free chlorine', shortLabel: 'Free Cl', icon: 'beaker', scaleMin: 0, scaleMax: 6, idealLow: 2, idealHigh: 4, decimals: 1 },
	{ key: 'ta', label: 'Total alkalinity', shortLabel: 'Alkalinity', icon: 'wave', scaleMin: 0, scaleMax: 200, idealLow: 80, idealHigh: 120, decimals: 0 },
	{ key: 'ch', label: 'Calcium hardness', shortLabel: 'Hardness', icon: 'spark', scaleMin: 0, scaleMax: 600, idealLow: 200, idealHigh: 400, decimals: 0 },
	{ key: 'cya', label: 'Cyanuric acid', shortLabel: 'CYA', icon: 'shield', scaleMin: 0, scaleMax: 100, idealLow: 30, idealHigh: 50, decimals: 0 },
	{ key: 'temp', label: 'Temperature', shortLabel: 'Temp', icon: 'thermo', scaleMin: 0, scaleMax: 50, decimals: 0 }
];

export const parameterByKey = Object.fromEntries(
	PARAMETERS.map((parameter) => [parameter.key, parameter])
) as Record<ParameterKey, ParameterDefinition>;

/**
 * Canonical value for a parameter out of a test row.
 * The single normalization point: alkalinity/hardness rows store the value
 * as entered alongside its unit — here it becomes ppm for all computation.
 */
export function testValue(test: TestRow, parameterKey: ParameterKey): number | null {
	switch (parameterKey) {
		case 'ph':
			return test.ph;
		case 'fc':
			return test.freeChlorine;
		case 'ta':
			return test.totalAlkalinity === null
				? null
				: hardnessToPpm(test.totalAlkalinity, test.totalAlkalinityUnit);
		case 'ch':
			return test.calciumHardness === null
				? null
				: hardnessToPpm(test.calciumHardness, test.calciumHardnessUnit);
		case 'cya':
			return test.cyanuricAcid;
		case 'temp':
			return test.temperature;
	}
}

export function readingStatus(
	parameter: ParameterDefinition,
	canonicalValue: number
): ReadingStatus {
	if (parameter.idealLow === undefined || parameter.idealHigh === undefined) return 'info';
	if (canonicalValue < parameter.idealLow) return 'low';
	if (canonicalValue > parameter.idealHigh) return 'high';
	return 'ok';
}

function clampFraction(fraction: number): number {
	return Math.min(1, Math.max(0, fraction));
}

export function scaleFraction(parameter: ParameterDefinition, canonicalValue: number): number {
	return clampFraction(
		(canonicalValue - parameter.scaleMin) / (parameter.scaleMax - parameter.scaleMin)
	);
}

/** canonical → display-unit value (ta/ch follow the hardness unit, temp follows °C/°F) */
export function displayValue(
	parameter: ParameterDefinition,
	canonicalValue: number,
	displayUnits: DisplayUnits
): number {
	if (parameter.key === 'ta' || parameter.key === 'ch') {
		return hardnessFromPpm(canonicalValue, displayUnits.hardnessUnit);
	}
	if (parameter.key === 'temp') {
		return temperatureFromCelsius(canonicalValue, displayUnits.temperatureUnit);
	}
	return canonicalValue;
}

/** unit suffix shown next to a parameter's display value ('' for pH) */
export function displayUnitText(parameter: ParameterDefinition, displayUnits: DisplayUnits): string {
	if (parameter.key === 'ph') return '';
	if (parameter.key === 'ta' || parameter.key === 'ch') return displayUnits.hardnessUnit;
	if (parameter.key === 'temp') return displayUnits.temperatureUnit;
	return 'ppm';
}

export function formatReading(value: number, decimals: number): string {
	return value.toFixed(decimals);
}

// ── gauge model for the Home screen ─────────────────────────────────
export interface GaugeReading {
	key: ParameterKey;
	label: string;
	/** formatted display value, '—' when never measured */
	value: string;
	unit: string;
	status: ReadingStatus;
	fraction: number;
	idealLowFraction: number;
	idealHighFraction: number;
}

export function gaugeReadings(
	latestTest: TestRow | undefined,
	displayUnits: DisplayUnits
): GaugeReading[] {
	return PARAMETERS.map((parameter) => {
		const canonicalValue = latestTest ? testValue(latestTest, parameter.key) : null;
		const idealLowFraction =
			parameter.idealLow !== undefined ? scaleFraction(parameter, parameter.idealLow) : 0;
		const idealHighFraction =
			parameter.idealHigh !== undefined ? scaleFraction(parameter, parameter.idealHigh) : 0;
		const unit = displayUnitText(parameter, displayUnits);

		if (canonicalValue === null) {
			return {
				key: parameter.key,
				label: parameter.shortLabel,
				value: '—',
				unit,
				status: 'info' as ReadingStatus,
				fraction: 0,
				idealLowFraction,
				idealHighFraction
			};
		}

		return {
			key: parameter.key,
			label: parameter.shortLabel,
			value: formatReading(
				displayValue(parameter, canonicalValue, displayUnits),
				parameter.decimals
			),
			unit,
			status: readingStatus(parameter, canonicalValue),
			fraction: scaleFraction(parameter, canonicalValue),
			idealLowFraction,
			idealHighFraction
		};
	});
}
