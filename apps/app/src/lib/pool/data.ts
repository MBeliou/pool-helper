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

// Generic kit names, not brands. NOTE (launch requirement, see
// docs/launch-checklist.md): tester storage needs an explicit TYPE
// (strips/drops/meter) — strips are known-unreliable and the engine will
// eventually weight readings by it. The names below encode type only loosely.
export const TESTERS: Tester[] = [
	{
		name: 'Test strips',
		description: 'Dip strips · 7-in-1 style',
		icon: 'beaker',
		measures: ['fc', 'tc', 'ph', 'ta', 'ch', 'cya']
	},
	{
		name: 'Drop test kit',
		description: 'Liquid reagent drops',
		icon: 'drop',
		measures: ['fc', 'tc', 'ph', 'ta', 'ch', 'cya']
	},
	// salt itself isn't modelled yet (post-v1) — the meter's thermometer is
	{ name: 'Salt meter', description: 'Digital · NaCl', icon: 'spark', measures: ['temp'] }
];

// pre-rename profiles/tests reference the old brand names — map them through
const LEGACY_TESTER_NAMES: Record<string, string> = {
	'AquaChek 7-in-1': 'Test strips',
	'Taylor K-2006': 'Drop test kit'
};

function canonicalTesterName(testerName: string): string {
	return LEGACY_TESTER_NAMES[testerName] ?? testerName;
}

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
	const canonicalName = canonicalTesterName(testerName);
	const catalogue = TESTERS.find((tester) => tester.name === canonicalName);
	return catalogue?.measures ?? ALL_READING_KEYS;
}

/** catalogue icon for known names; custom kits get the beaker */
export function testerIcon(testerName: string): IconName {
	const canonicalName = canonicalTesterName(testerName);
	return TESTERS.find((tester) => tester.name === canonicalName)?.icon ?? 'beaker';
}
