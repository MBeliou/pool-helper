import type { IconName } from './icons';

// Testers for the Log flow (static catalogue; the selection persists in the profile)
export interface Tester {
	name: string;
	description: string;
	icon: IconName;
}

export const TESTERS: Tester[] = [
	{ name: 'AquaChek 7-in-1', description: 'Strips · 7 reads', icon: 'beaker' },
	{ name: 'Taylor K-2006', description: 'Liquid drops', icon: 'drop' },
	{ name: 'Salt meter', description: 'Digital · NaCl', icon: 'spark' }
];
