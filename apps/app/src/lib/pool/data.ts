import type { IconName } from './icons';

/** everything the log-entry form can capture (tc = total chlorine) */
export type ReadingKey = 'ph' | 'fc' | 'tc' | 'ta' | 'ch' | 'cya' | 'temp';

// Testers for the Log flow (static catalogue; the selection persists in the profile)
export interface Tester {
	name: string;
	description: string;
	icon: IconName;
	/** what this kit actually reads, in the order it reports them */
	measures: ReadingKey[];
}

export const TESTERS: Tester[] = [
	{
		name: 'AquaChek 7-in-1',
		description: 'Strips · 7 reads',
		icon: 'beaker',
		measures: ['fc', 'tc', 'ph', 'ta', 'ch', 'cya']
	},
	{
		name: 'Taylor K-2006',
		description: 'Liquid drops',
		icon: 'drop',
		measures: ['fc', 'tc', 'ph', 'ta', 'ch', 'cya']
	},
	// salt itself isn't modelled yet (post-v1) — the meter's thermometer is
	{ name: 'Salt meter', description: 'Digital · NaCl', icon: 'spark', measures: ['temp'] }
];

export const ALL_READING_KEYS: ReadingKey[] = ['ph', 'fc', 'tc', 'ta', 'ch', 'cya', 'temp'];
