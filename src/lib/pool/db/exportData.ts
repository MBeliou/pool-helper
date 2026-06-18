// Builds a single portable JSON snapshot of everything the app stores, assembled
// from the existing repositories so it works identically on web and native.
import { loadProfile, type ProfileValues } from './profileRepository';
import { listTests } from './testsRepository';
import { listActions } from './actionsRepository';
import { listIssues, listEventsForIssue } from './issuesRepository';
import { listDiagnoses } from './diagnosesRepository';
import migrationJournal from './migrations/meta/_journal.json';
import type { ActionRow, DiagnosisRow, IssueEventRow, IssueRow, TestRow } from './schema';

export interface ExportBundle {
	app: 'my-pool';
	// matches the latest migration index — a future importer can branch on it
	schemaVersion: number;
	exportedAt: string;
	profile: ProfileValues | null;
	tests: TestRow[];
	actions: ActionRow[];
	issues: (IssueRow & { events: IssueEventRow[] })[];
	diagnoses: DiagnosisRow[];
}

// latest applied migration index, so the bundle's version never drifts when a
// migration is added
const SCHEMA_VERSION = Math.max(...migrationJournal.entries.map((entry) => entry.idx));

export async function exportAllData(): Promise<ExportBundle> {
	// sequential: the drizzle sqlite-proxy shares one connection, so we don't
	// fire overlapping queries at it
	const profile = (await loadProfile()) ?? null;
	const tests = await listTests();
	const actions = await listActions();
	const issues = await listIssues();
	const diagnoses = await listDiagnoses();

	const issuesWithEvents: (IssueRow & { events: IssueEventRow[] })[] = [];
	for (const issue of issues) {
		issuesWithEvents.push({ ...issue, events: await listEventsForIssue(issue.id) });
	}

	return {
		app: 'my-pool',
		schemaVersion: SCHEMA_VERSION,
		exportedAt: new Date().toISOString(),
		profile,
		tests,
		actions,
		issues: issuesWithEvents,
		diagnoses
	};
}
