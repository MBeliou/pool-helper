import { asc, desc, eq } from 'drizzle-orm';
import { database } from './connection';
import { issuesTable, issueEventsTable, type IssueRow, type IssueEventRow } from './schema';

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

export async function resolveIssue(issueId: number): Promise<void> {
	await database
		.update(issuesTable)
		.set({ resolvedAt: new Date(), progress: 1 })
		.where(eq(issuesTable.id, issueId));
}
