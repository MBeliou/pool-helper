import { asc, desc, eq } from 'drizzle-orm';
import { database } from './connection';
import {
	issuesTable,
	issueEventsTable,
	type IssueRow,
	type IssueEventRow,
	type NewIssueRow,
	type NewIssueEventRow
} from './schema';

/** all issues, active first, newest first within each group */
export async function listIssues(): Promise<IssueRow[]> {
	const rows = await database.select().from(issuesTable).orderBy(desc(issuesTable.startedAt));
	return [
		...rows.filter((issue) => !issue.resolvedAt),
		...rows.filter((issue) => issue.resolvedAt)
	];
}

export async function getIssue(issueId: number): Promise<IssueRow | undefined> {
	const rows = await database
		.select()
		.from(issuesTable)
		.where(eq(issuesTable.id, issueId))
		.limit(1);
	return rows[0];
}

export async function listEventsForIssue(issueId: number): Promise<IssueEventRow[]> {
	return database
		.select()
		.from(issueEventsTable)
		.where(eq(issueEventsTable.issueId, issueId))
		.orderBy(asc(issueEventsTable.orderIndex));
}

/**
 * Insert an issue plus its initial timeline events in one go, returning the new
 * issue id. The drizzle sqlite-proxy has no `.returning()`, so we read the id
 * back the same way demoData does (newest row by id).
 */
export async function createIssueWithPlan(
	issue: NewIssueRow,
	events: Omit<NewIssueEventRow, 'issueId'>[]
): Promise<number> {
	await database.insert(issuesTable).values(issue);
	const [latest] = await database
		.select({ id: issuesTable.id })
		.from(issuesTable)
		.orderBy(desc(issuesTable.id))
		.limit(1);
	if (!latest) throw new Error('expected an issue row after insert');
	const issueId = latest.id;
	if (events.length > 0) {
		await database.insert(issueEventsTable).values(events.map((event) => ({ ...event, issueId })));
	}
	return issueId;
}

export async function resolveIssue(issueId: number): Promise<void> {
	await database
		.update(issuesTable)
		.set({ resolvedAt: new Date(), progress: 1 })
		.where(eq(issuesTable.id, issueId));
}
