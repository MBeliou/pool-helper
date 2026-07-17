// Pure scenario data for the guidance-engine demo seeds — no database imports,
// so demoScenarios.spec.ts can pin each scenario's latest readings to the
// engine's expected outcome without touching the SQLite layer. demoData.ts
// turns these definitions into actual seeders.
//
// Each scenario mirrors a canonical case in guidance/engine.spec.ts: the
// newest history row (daysAgo 0) equals that case's readings EXACTLY (nulls
// included); earlier rows just trend into it so gauges and trends look alive.
import type { ProfileValues } from './profileRepository';

/**
 * Guidance-relevant base pool the scenarios override — mirrors the spec's
 * OUTDOOR_CHLORINE_PLASTER config. ppm hardness so gauges show the engine-spec
 * numbers verbatim. demoData.ts spreads this into the full demo profile.
 */
export const DEMO_BASE_POOL = {
	volume: 30_000,
	volumeUnit: 'litres',
	hardnessUnit: 'ppm',
	surface: 'Plaster',
	sanitiser: 'Chlorine',
	location: 'Outdoor',
	sunExposure: 'Full sun'
} satisfies Partial<ProfileValues>;

/** (daysAgo, ph, fc/bromine, ta, ch, cya, temp°C, tc?) — null = not measured that day */
export type HistoryRow = [
	daysAgo: number,
	ph: number | null,
	fc: number | null,
	ta: number | null,
	ch: number | null,
	cya: number | null,
	temp: number | null,
	tc?: number | null
];

export interface GuidanceScenarioDefinition {
	/** deep-link slug: mypool://seed/<id> */
	id: string;
	/** button label on the More screen */
	title: string;
	/** button subtitle: the engine behaviour this scenario demonstrates */
	description: string;
	/** overrides applied on top of the demo base profile */
	profile: Partial<ProfileValues>;
	/** oldest first; last row is the latest test */
	history: HistoryRow[];
}

export const GUIDANCE_SCENARIO_DEFINITIONS: GuidanceScenarioDefinition[] = [
	{
		id: 'cya-zero',
		title: 'CYA at zero',
		description: 'Chlorine reads fine but won’t hold — stabiliser is the root cause',
		profile: {},
		history: [
			[9, 7.5, 1.0, 84, 105, 0, 24],
			[6, 7.4, 2.2, 82, 102, 0, 25],
			[3, 7.3, 2.8, 81, 100, 0, 25],
			[0, 7.2, 3.0, 80, 100, 0, null]
		]
	},
	{
		id: 'high-ta',
		title: 'High TA drags pH',
		description: 'One acid step, TA fix deferred behind the retest',
		profile: { volume: 50_000 },
		history: [
			[12, 7.6, 5.5, 170, 300, 40, 26],
			[9, 7.7, 5.2, 175, 300, 40, 27],
			[6, 7.8, 5.0, 176, 298, 40, 27],
			[3, 7.9, 5.1, 178, 301, 41, 28],
			[0, 8.0, 5.0, 180, 300, 40, 28]
		]
	},
	{
		id: 'corrosive',
		title: 'Corrosive water',
		description: 'Saturation index below −0.3 — raise calcium',
		profile: { volume: 40_000 },
		history: [
			[10, 7.4, 4.8, 70, 160, 40, 28],
			[7, 7.3, 5.0, 68, 158, 40, 29],
			[4, 7.3, 4.9, 65, 155, 41, 29],
			[0, 7.2, 5.0, 60, 150, 40, 30]
		]
	},
	{
		id: 'bromine-low',
		title: 'Bromine fading',
		description: 'Bromine pool below the safety floor — no CYA coupling',
		profile: { sanitiser: 'Bromine' },
		history: [
			[9, 7.5, 3.5, 82, null, 0, null],
			[6, 7.4, 2.8, 81, null, 0, null],
			[3, 7.4, 2.0, 80, null, 0, null],
			[0, 7.4, 1.0, 80, null, 0, null]
		]
	},
	{
		id: 'swg-nudge',
		title: 'SWG below target',
		description: 'Above the floor, under target — nudge the cell, no dose',
		profile: { sanitiser: 'Salt (SWG)' },
		history: [
			[9, 7.5, 3.6, 82, 305, 68, 27],
			[6, 7.5, 3.5, 80, 300, 70, 28],
			[3, 7.6, 3.4, 81, 300, 70, 28],
			[0, 7.5, 3.2, 80, 300, 70, 28]
		]
	},
	{
		id: 'smelly-water',
		title: 'Chlorine smell',
		description: 'High combined chlorine — the shock-to-clear case',
		profile: {},
		history: [
			[9, 7.4, 3.4, 82, 300, 40, 26, 4.0],
			[6, 7.4, 3.0, 81, 300, 40, 26, 4.1],
			[3, 7.5, 2.4, 80, 298, 41, 27, 4.3],
			[0, 7.4, 2.0, 80, 300, 40, 26, 4.5]
		]
	},
	{
		id: 'persistent-chloramines',
		title: 'Stubborn combined Cl',
		description: 'Mild combined chlorine on 3 tests running — history escalates to the shock',
		profile: {},
		history: [
			[5, 7.4, 3.2, 82, 300, 40, 26, 4.4],
			[3, 7.4, 3.0, 81, 300, 40, 26, 4.2],
			[1, 7.5, 2.8, 80, 298, 41, 27, 4.1],
			[0, 7.4, 2.6, 80, 300, 40, 26, 4.0]
		]
	},
	{
		id: 'safety-floor',
		title: 'FC emergency',
		description: 'Strip shows 0.2 ppm alone — safety raise despite unknown CYA',
		profile: {},
		history: [
			[6, null, 2.4, null, null, null, null],
			[3, null, 1.2, null, null, null, null],
			[0, null, 0.2, null, null, null, null]
		]
	}
];

/** the scenario's newest readings in engine shape (history is oldest-first) */
export function latestReadings(definition: GuidanceScenarioDefinition): {
	fc: number | null;
	tc: number | null;
	ph: number | null;
	ta: number | null;
	ch: number | null;
	cya: number | null;
	temp: number | null;
} {
	const [, ph, fc, ta, ch, cya, temp, tc] = definition.history[definition.history.length - 1];
	return { fc, tc: tc ?? null, ph, ta, ch, cya, temp };
}
