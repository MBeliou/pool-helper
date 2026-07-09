import { asc, eq } from 'drizzle-orm';
import { database } from './connection';
import { testersTable, type TesterRow } from './schema';
import type { ReadingKey, TesterType } from '../data';

export interface StoredTester {
	id: number;
	name: string;
	type: TesterType;
	measures: ReadingKey[];
}

function parseMeasures(row: TesterRow): ReadingKey[] {
	try {
		const parsed = JSON.parse(row.measures);
		return Array.isArray(parsed) ? (parsed as ReadingKey[]) : [];
	} catch {
		return [];
	}
}

/** the user's testers, oldest first (setup order) */
export async function listTesters(): Promise<StoredTester[]> {
	const rows = await database.select().from(testersTable).orderBy(asc(testersTable.id));
	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		type: row.type,
		measures: parseMeasures(row)
	}));
}

export async function insertTester(
	name: string,
	measures: ReadingKey[],
	type: TesterType
): Promise<void> {
	await database
		.insert(testersTable)
		.values({ name, measures: JSON.stringify(measures), type, createdAt: new Date() });
}

export async function deleteTester(testerId: number): Promise<void> {
	await database.delete(testersTable).where(eq(testersTable.id, testerId));
}
