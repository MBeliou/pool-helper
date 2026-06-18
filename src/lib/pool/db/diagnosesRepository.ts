import { desc } from 'drizzle-orm';
import { database } from './connection';
import { diagnosesTable, type DiagnosisRow, type NewDiagnosisRow } from './schema';

export async function insertDiagnosis(newDiagnosis: NewDiagnosisRow): Promise<void> {
	await database.insert(diagnosesTable).values(newDiagnosis);
}

/** all diagnoses, newest first */
export async function listDiagnoses(): Promise<DiagnosisRow[]> {
	return database.select().from(diagnosesTable).orderBy(desc(diagnosesTable.createdAt));
}
