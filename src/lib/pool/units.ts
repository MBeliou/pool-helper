// Measurement units — single source of truth; schema columns and UI selectors
// derive their literal types from these consts.

export const VOLUME_UNITS = ['litres', 'gallons', 'm³'] as const;
export type VolumeUnit = (typeof VOLUME_UNITS)[number];

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
