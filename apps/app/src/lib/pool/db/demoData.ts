// Demo data scenarios so display and flow can be exercised in different states.
// Reachable from the More screen's Developer section and mypool://seed/<id>.
import { desc } from 'drizzle-orm';
import { database } from './connection';
import { loadProfile, saveProfile, type ProfileValues } from './profileRepository';
import { DEMO_BASE_POOL, GUIDANCE_SCENARIO_DEFINITIONS, type HistoryRow } from './demoScenarios';
import {
	actionsTable,
	diagnosesTable,
	issuesTable,
	issueEventsTable,
	profileTable,
	testsTable,
	type NewTestRow
} from './schema';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgoAt(days: number, hour: number, minute = 0): Date {
	const date = new Date(Date.now() - days * DAY_MS);
	date.setHours(hour, minute, 0, 0);
	return date;
}

// Scenarios write the PROFILE too — guidance output depends on it (sanitiser,
// surface, sun, volume), so a scenario is only reproducible with both halves.
const DEMO_BASE_PROFILE: ProfileValues = {
	onboarded: true,
	name: 'My pool',
	shape: 'Oval',
	...DEMO_BASE_POOL,
	filter: 'Sand',
	unitsPreset: 'Metric (most of world)',
	temperatureUnit: '°C',
	tester: 'AquaChek 7-in-1',
	reminderDays: 3,
	disclaimerAcceptedAt: null
};

async function writeDemoProfile(overrides: Partial<ProfileValues>): Promise<void> {
	const currentProfile = await loadProfile();
	await saveProfile({
		...DEMO_BASE_PROFILE,
		// sticky user acknowledgement, not scenario data — don't re-prompt on dose views
		disclaimerAcceptedAt: currentProfile?.disclaimerAcceptedAt ?? null,
		...overrides
	});
}

function toTestRows(
	history: HistoryRow[],
	options?: { tester?: string; unit?: 'ppm' | '°fH'; hour?: number }
): NewTestRow[] {
	const { tester = 'AquaChek 7-in-1', unit = 'ppm', hour = 8 } = options ?? {};
	return history.map(
		([daysAgo, ph, freeChlorine, totalAlkalinity, calciumHardness, cyanuricAcid, temperature]) => ({
			testedAt: daysAgoAt(daysAgo, hour, 30),
			tester,
			ph,
			freeChlorine,
			totalAlkalinity,
			totalAlkalinityUnit: unit,
			calciumHardness,
			calciumHardnessUnit: unit,
			cyanuricAcid,
			temperature
		})
	);
}

export async function clearLoggedData(): Promise<void> {
	// diagnoses + issue_events reference issues, so delete the children first
	await database.delete(actionsTable);
	await database.delete(diagnosesTable);
	await database.delete(issueEventsTable);
	await database.delete(issuesTable);
	await database.delete(testsTable);
}

/**
 * Dev/QA full wipe: everything `clearLoggedData` removes **plus** the profile
 * row, returning the database to a fresh-install state. With no profile row,
 * the next `app.load()` finds nothing to hydrate and the onboarding gate fires —
 * use this to replay onboarding from scratch.
 */
export async function wipeAllData(): Promise<void> {
	await clearLoggedData();
	await database.delete(profileTable);
}

/**
 * Dev/QA helper: append a single mid-range test dated now, so empty states and
 * single-entry layouts can be exercised without loading a whole month of data.
 */
export async function seedSingleTest(): Promise<void> {
	await database.insert(testsTable).values({
		testedAt: new Date(),
		tester: 'AquaChek 7-in-1',
		ph: 7.4,
		freeChlorine: 3.0,
		totalAlkalinity: 90,
		totalAlkalinityUnit: 'ppm',
		calciumHardness: 250,
		calciumHardnessUnit: 'ppm',
		cyanuricAcid: 40,
		temperature: 26
	});
}

async function latestIssueId(): Promise<number> {
	const rows = await database
		.select({ id: issuesTable.id })
		.from(issuesTable)
		.orderBy(desc(issuesTable.id))
		.limit(1);
	if (!rows[0]) throw new Error('expected an issue row after insert');
	return rows[0].id;
}

/**
 * "Problem pool": a month of history matching the design narrative —
 * pH creeping up, chlorine dropping, the rest steady — plus care issues.
 */
export async function seedProblemPool(): Promise<void> {
	await clearLoggedData();
	await writeDemoProfile({ volume: 50_000 });

	const history: HistoryRow[] = [
		// quiet spring months — makes the 90d/1y trend ranges visibly different
		[100, 7.2, 3.6, 96, 230, 36, 17],
		[88, 7.2, 3.5, 97, 232, 36, 18],
		[76, 7.2, 3.4, 95, 233, 37, 18],
		[64, 7.3, 3.4, 96, 234, 37, 19],
		[52, 7.3, 3.3, 94, 234, 38, 20],
		[40, 7.3, 3.3, 95, 236, 38, 20],
		[32, 7.3, 3.2, 95, 235, 38, 21],
		[29, 7.3, 3.0, 92, 238, 39, 22],
		[26, 7.4, 2.8, 94, 240, 40, 22],
		[23, 7.4, 2.6, 90, 242, 41, 23],
		[20, 7.5, 2.4, 91, 238, 42, 23],
		[17, 7.5, 2.2, 89, 240, 43, 24],
		[14, 7.6, 2.0, 92, 241, 43, 24],
		[11, 7.6, 1.8, 90, 239, 44, 25],
		[8, 7.7, 1.5, 91, 240, 44, 25],
		[5, 7.7, 1.2, 88, 242, 45, 26],
		[2, 7.8, 1.0, 90, 240, 45, 26],
		[0, 7.8, 0.8, 90, 240, 45, 26]
	];
	await database.insert(testsTable).values(toTestRows(history));

	// issue 1 · cloudy water, mid-resolution
	await database.insert(issuesTable).values({
		title: 'Cloudy water',
		statusKey: 'high',
		subtitle: 'Next: run pump 24h',
		banner: 'Improving. Clarity up since the shock — on track to clear by tomorrow.',
		progress: 0.4,
		expectedDays: 3,
		startedAt: daysAgoAt(1, 9)
	});
	const cloudyWaterId = await latestIssueId();
	await database.insert(issueEventsTable).values([
		{
			issueId: cloudyWaterId,
			orderIndex: 0,
			title: 'Shocked to 10 ppm FC',
			happenedAt: daysAgoAt(1, 9),
			state: 'done'
		},
		{
			issueId: cloudyWaterId,
			orderIndex: 1,
			title: 'Re-tested · FC holding 6 ppm',
			happenedAt: daysAgoAt(1, 18),
			state: 'done'
		},
		{
			issueId: cloudyWaterId,
			orderIndex: 2,
			title: 'Pump running 24h',
			whenLabel: 'In progress',
			state: 'active'
		},
		{
			issueId: cloudyWaterId,
			orderIndex: 3,
			title: 'Add clarifier + vacuum',
			whenLabel: 'Day 3 · upcoming',
			state: 'upcoming'
		}
	]);

	// issue 2 · slow-burn pH drift
	await database.insert(issuesTable).values({
		title: 'Rising pH',
		statusKey: 'high',
		subtitle: 'Recurring · new plaster',
		banner: 'Fresh plaster keeps nudging pH up — expect small acid doses for a while.',
		progress: 0.2,
		startedAt: daysAgoAt(21, 10)
	});
	const risingPhId = await latestIssueId();
	await database.insert(issueEventsTable).values([
		{
			issueId: risingPhId,
			orderIndex: 0,
			title: 'Dosed 680 g dry acid',
			happenedAt: daysAgoAt(14, 11),
			state: 'done'
		},
		{
			issueId: risingPhId,
			orderIndex: 1,
			title: 'Dosed 540 g dry acid',
			happenedAt: daysAgoAt(7, 9),
			state: 'done'
		},
		{
			issueId: risingPhId,
			orderIndex: 2,
			title: 'Watch weekly · re-dose when above 7.6',
			whenLabel: 'Ongoing',
			state: 'active'
		}
	]);

	// issue 3 · resolved algae bloom
	await database.insert(issuesTable).values({
		title: 'Algae bloom',
		statusKey: 'ok',
		subtitle: 'Resolved · took 4 days',
		progress: 1,
		expectedDays: 4,
		startedAt: daysAgoAt(13, 8),
		resolvedAt: daysAgoAt(9, 17)
	});
	const algaeBloomId = await latestIssueId();
	await database.insert(issueEventsTable).values([
		{
			issueId: algaeBloomId,
			orderIndex: 0,
			title: 'Brushed walls + shocked to 12 ppm',
			happenedAt: daysAgoAt(13, 9),
			state: 'done'
		},
		{
			issueId: algaeBloomId,
			orderIndex: 1,
			title: 'Filtered 48h · vacuumed debris',
			happenedAt: daysAgoAt(11, 10),
			state: 'done'
		},
		{
			issueId: algaeBloomId,
			orderIndex: 2,
			title: 'Water clear · FC back to 4 ppm',
			happenedAt: daysAgoAt(9, 17),
			state: 'done'
		}
	]);

	// actions taken — journal entries mirroring the issue work + one standalone
	await database.insert(actionsTable).values([
		{
			performedAt: daysAgoAt(1, 9),
			title: 'Shocked to 10 ppm FC',
			detail: 'Cal-Hypo 65% · 1.4 kg',
			issueId: cloudyWaterId
		},
		{ performedAt: daysAgoAt(7, 9), title: 'Dosed 540 g dry acid', issueId: risingPhId },
		{ performedAt: daysAgoAt(14, 11), title: 'Dosed 680 g dry acid', issueId: risingPhId },
		{ performedAt: daysAgoAt(13, 9), title: 'Brushed walls + vacuumed', issueId: algaeBloomId },
		{ performedAt: daysAgoAt(10, 18), title: 'Backwashed filter', detail: 'Routine maintenance' }
	]);
}

/**
 * "Balanced pool": everything mid-range, no issues — the happy path.
 * Alkalinity/hardness are logged in °fH (French kit) to exercise
 * mixed-unit normalization (10 °fH = 100 ppm).
 */
export async function seedBalancedPool(): Promise<void> {
	await clearLoggedData();
	await writeDemoProfile({ hardnessUnit: '°fH', tester: 'Taylor K-2006', volume: 50_000 });
	// (ta/ch in °fH — French kit)
	const history: HistoryRow[] = [
		[21, 7.4, 3.1, 10.2, 25.2, 41, 25],
		[18, 7.4, 3.0, 10.0, 25.0, 40, 26],
		[15, 7.5, 2.9, 9.8, 25.1, 40, 26],
		[12, 7.4, 3.0, 10.1, 24.9, 41, 27],
		[9, 7.4, 3.1, 10.0, 25.0, 40, 27],
		[6, 7.5, 3.0, 9.9, 25.0, 40, 28],
		[3, 7.4, 2.9, 10.0, 25.1, 40, 28],
		[0, 7.4, 3.0, 10.0, 25.0, 40, 28]
	];
	await database
		.insert(testsTable)
		.values(toTestRows(history, { tester: 'Taylor K-2006', unit: '°fH', hour: 9 }));
	await database
		.insert(actionsTable)
		.values([
			{ performedAt: daysAgoAt(5, 18), title: 'Backwashed filter', detail: 'Routine maintenance' }
		]);
}

// ── guidance-engine scenarios ──────────────────────────────────────────
// One seeder per canonical engine.spec.ts case; the data lives in
// demoScenarios.ts (pure) so demoScenarios.spec.ts pins it to the engine.

export interface DemoScenario {
	id: string;
	title: string;
	description: string;
	load: () => Promise<void>;
}

export const GUIDANCE_SCENARIOS: DemoScenario[] = GUIDANCE_SCENARIO_DEFINITIONS.map(
	(definition) => ({
		id: definition.id,
		title: definition.title,
		description: definition.description,
		load: async () => {
			await clearLoggedData();
			await writeDemoProfile(definition.profile);
			await database.insert(testsTable).values(toTestRows(definition.history));
		}
	})
);
