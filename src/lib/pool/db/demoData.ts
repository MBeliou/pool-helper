// Demo data scenarios so display and flow can be exercised in different states.
// Reachable from the More screen's Developer section.
import { desc } from 'drizzle-orm';
import { database } from './connection';
import { actionsTable, issuesTable, issueEventsTable, testsTable, type NewTestRow } from './schema';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgoAt(days: number, hour: number, minute = 0): Date {
	const date = new Date(Date.now() - days * DAY_MS);
	date.setHours(hour, minute, 0, 0);
	return date;
}

export async function clearLoggedData(): Promise<void> {
	await database.delete(actionsTable);
	await database.delete(issueEventsTable);
	await database.delete(issuesTable);
	await database.delete(testsTable);
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

	// (daysAgo, ph, fc, ta, chPpm, cya, temp°C)
	const history: [number, number, number, number, number, number, number][] = [
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
	const testRows: NewTestRow[] = history.map(
		([daysAgo, ph, freeChlorine, totalAlkalinity, calciumHardness, cyanuricAcid, temperature]) => ({
			testedAt: daysAgoAt(daysAgo, 8, 30),
			tester: 'AquaChek 7-in-1',
			ph,
			freeChlorine,
			totalAlkalinity,
			totalAlkalinityUnit: 'ppm' as const,
			calciumHardness,
			calciumHardnessUnit: 'ppm' as const,
			cyanuricAcid,
			temperature
		})
	);
	await database.insert(testsTable).values(testRows);

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
	// (daysAgo, ph, fc, ta °fH, ch °fH, cya, temp °C)
	const history: [number, number, number, number, number, number, number][] = [
		[21, 7.4, 3.1, 10.2, 25.2, 41, 25],
		[18, 7.4, 3.0, 10.0, 25.0, 40, 26],
		[15, 7.5, 2.9, 9.8, 25.1, 40, 26],
		[12, 7.4, 3.0, 10.1, 24.9, 41, 27],
		[9, 7.4, 3.1, 10.0, 25.0, 40, 27],
		[6, 7.5, 3.0, 9.9, 25.0, 40, 28],
		[3, 7.4, 2.9, 10.0, 25.1, 40, 28],
		[0, 7.4, 3.0, 10.0, 25.0, 40, 28]
	];
	const testRows: NewTestRow[] = history.map(
		([daysAgo, ph, freeChlorine, totalAlkalinity, calciumHardness, cyanuricAcid, temperature]) => ({
			testedAt: daysAgoAt(daysAgo, 9, 0),
			tester: 'Taylor K-2006',
			ph,
			freeChlorine,
			totalAlkalinity,
			totalAlkalinityUnit: '°fH' as const,
			calciumHardness,
			calciumHardnessUnit: '°fH' as const,
			cyanuricAcid,
			temperature
		})
	);
	await database.insert(testsTable).values(testRows);
	await database
		.insert(actionsTable)
		.values([
			{ performedAt: daysAgoAt(5, 18), title: 'Backwashed filter', detail: 'Routine maintenance' }
		]);
}
