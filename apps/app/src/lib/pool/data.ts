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

/** short labels for the tester-form checkboxes and tester descriptions */
export const READING_LABELS: Record<ReadingKey, string> = {
	ph: 'pH',
	fc: 'Free chlorine',
	tc: 'Total chlorine',
	ta: 'Alkalinity',
	ch: 'Hardness',
	cya: 'Stabiliser (CYA)',
	temp: 'Water temp'
};

/**
 * What a tester by this name can record: the user's stored testers win,
 * then the catalogue, then everything (unknown names never lose fields).
 */
export function resolveTesterMeasures(
	testerName: string,
	storedTesters: { name: string; measures: ReadingKey[] }[]
): ReadingKey[] {
	const stored = storedTesters.find((tester) => tester.name === testerName);
	if (stored && stored.measures.length > 0) return stored.measures;
	const catalogue = TESTERS.find((tester) => tester.name === testerName);
	return catalogue?.measures ?? ALL_READING_KEYS;
}

/** catalogue icon for known names; custom kits get the beaker */
export function testerIcon(testerName: string): IconName {
	return TESTERS.find((tester) => tester.name === testerName)?.icon ?? 'beaker';
}
