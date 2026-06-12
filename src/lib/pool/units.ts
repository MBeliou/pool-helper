// Measurement units — single source of truth; schema columns and UI selectors
// derive their literal types from these consts.

// US and imperial gallons differ by ~17% — they must stay distinct units
export const VOLUME_UNITS = ['litres', 'US gal', 'imp gal', 'm³'] as const;
export type VolumeUnit = (typeof VOLUME_UNITS)[number];

export const LITRES_PER_VOLUME_UNIT: Record<VolumeUnit, number> = {
	litres: 1,
	'US gal': 3.785,
	'imp gal': 4.546,
	'm³': 1000
};

// Alkalinity and calcium hardness are both CaCO₃ equivalents and share units:
// ppm (mg/L), French degrees (1 °fH = 10 ppm), German degrees (1 °dH = 17.8 ppm).
export const HARDNESS_UNITS = ['ppm', '°fH', '°dH'] as const;
export type HardnessUnit = (typeof HARDNESS_UNITS)[number];

export const TEMPERATURE_UNITS = ['°C', '°F'] as const;
export type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number];

const PPM_PER_HARDNESS_UNIT: Record<HardnessUnit, number> = {
	ppm: 1,
	'°fH': 10,
	'°dH': 17.8
};

export function hardnessToPpm(value: number, unit: HardnessUnit): number {
	return value * PPM_PER_HARDNESS_UNIT[unit];
}

export function hardnessFromPpm(ppm: number, unit: HardnessUnit): number {
	return ppm / PPM_PER_HARDNESS_UNIT[unit];
}

export function temperatureFromCelsius(celsius: number, unit: TemperatureUnit): number {
	return unit === '°F' ? celsius * 1.8 + 32 : celsius;
}

export function temperatureToCelsius(value: number, unit: TemperatureUnit): number {
	return unit === '°F' ? (value - 32) / 1.8 : value;
}
