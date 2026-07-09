import { desc, eq, isNotNull, and } from 'drizzle-orm';
import { database } from './connection';
import { actionsTable, type ActionRow, type NewActionRow } from './schema';

/**
 * Insert an action. Fix-plan steps carry (sourceTestId, parameterKey), which is
 * unique — a re-tapped "Mark all done" quietly no-ops instead of duplicating.
 */
export async function insertAction(newAction: NewActionRow): Promise<void> {
	await database.insert(actionsTable).values(newAction).onConflictDoNothing();
}

/** all actions, newest first */
export async function listActions(): Promise<ActionRow[]> {
	return database.select().from(actionsTable).orderBy(desc(actionsTable.performedAt));
}

/** parameters of the given test whose fix-plan step was already completed */
export async function completedPlanParameterKeys(testId: number): Promise<Set<string>> {
	const rows = await database
		.select({ parameterKey: actionsTable.parameterKey })
		.from(actionsTable)
		.where(and(eq(actionsTable.sourceTestId, testId), isNotNull(actionsTable.parameterKey)));
	return new Set(rows.map((row) => row.parameterKey as string));
}
