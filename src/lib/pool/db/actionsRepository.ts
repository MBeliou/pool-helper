import { desc } from 'drizzle-orm';
import { database } from './connection';
import { actionsTable, type ActionRow, type NewActionRow } from './schema';

export async function insertAction(newAction: NewActionRow): Promise<void> {
	await database.insert(actionsTable).values(newAction);
}

/** all actions, newest first */
export async function listActions(): Promise<ActionRow[]> {
	return database.select().from(actionsTable).orderBy(desc(actionsTable.performedAt));
}
