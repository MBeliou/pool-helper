import { count, desc, eq, gte } from 'drizzle-orm';
import { database } from './connection';
import { testsTable, type NewTestRow, type TestRow } from './schema';

export async function insertTest(newTest: NewTestRow): Promise<void> {
	// no .returning() — the proxy executor routes mutations through the plugin's run()
	await database.insert(testsTable).values(newTest);
}

export async function getLatestTest(): Promise<TestRow | undefined> {
	const rows = await database.select().from(testsTable).orderBy(desc(testsTable.testedAt)).limit(1);
	return rows[0];
}

/** tests from the last `days` days, oldest first (chart order) */
export async function getTestsSince(days: number): Promise<TestRow[]> {
	const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const rows = await database
		.select()
		.from(testsTable)
		.where(gte(testsTable.testedAt, cutoff))
		.orderBy(desc(testsTable.testedAt));
	return rows.reverse();
}

/** all tests, newest first (journal order) */
export async function listTests(): Promise<TestRow[]> {
	return database.select().from(testsTable).orderBy(desc(testsTable.testedAt));
}

export async function getTestById(testId: number): Promise<TestRow | undefined> {
	const rows = await database.select().from(testsTable).where(eq(testsTable.id, testId)).limit(1);
	return rows[0];
}

export async function countTests(): Promise<number> {
	const rows = await database.select({ testCount: count() }).from(testsTable);
	return rows[0]?.testCount ?? 0;
}
