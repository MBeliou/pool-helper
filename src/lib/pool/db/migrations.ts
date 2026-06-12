import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import migrationJournal from './migrations/meta/_journal.json';

// migration SQL bundled at build time — no filesystem access on device
const migrationSqlByPath = import.meta.glob('./migrations/*.sql', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

/** Apply any drizzle-kit migrations that haven't run yet, tracked in a `migrations` table. */
export async function runDatabaseMigrations(databaseConnection: SQLiteDBConnection): Promise<void> {
	await databaseConnection.execute(
		'CREATE TABLE IF NOT EXISTS migrations (tag TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);',
		false
	);
	const appliedResult = await databaseConnection.query('SELECT tag FROM migrations;');
	const appliedTags = new Set((appliedResult.values ?? []).map((row) => row.tag as string));

	const orderedEntries = [...migrationJournal.entries].sort(
		(left, right) => left.idx - right.idx
	);
	for (const entry of orderedEntries) {
		if (appliedTags.has(entry.tag)) continue;
		const migrationSql = migrationSqlByPath[`./migrations/${entry.tag}.sql`];
		if (!migrationSql) throw new Error(`Missing migration file for tag ${entry.tag}`);
		const statements = migrationSql
			.split(STATEMENT_BREAKPOINT)
			.map((statement) => statement.trim())
			.filter(Boolean);

		await databaseConnection.beginTransaction();
		try {
			for (const statement of statements) {
				await databaseConnection.execute(statement, false);
			}
			await databaseConnection.run(
				'INSERT INTO migrations (tag, applied_at) VALUES (?, ?);',
				[entry.tag, Date.now()],
				false
			);
			await databaseConnection.commitTransaction();
		} catch (migrationError) {
			await databaseConnection.rollbackTransaction();
			throw migrationError;
		}
	}
}
