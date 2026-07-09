import { describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { runDatabaseMigrations } from './migrations';
import migrationJournal from './migrations/meta/_journal.json';
import createTestersSql from './migrations/0012_custom_testers.sql?raw';
import testerTypeSql from './migrations/0013_tester_type.sql?raw';

const orderedTags = [...migrationJournal.entries]
	.sort((left, right) => left.idx - right.idx)
	.map((entry) => entry.tag);

// Minimal in-memory stand-in for the plugin connection: it tracks the
// `migrations` table, mirrors the transaction semantics the runner relies on
// (rollback reverts inserts), and can be told to throw on a chosen statement.
type ExecuteHook = (sql: string) => void;

class FakeSQLiteConnection {
	appliedTags = new Set<string>();
	appliedOrder: string[] = [];
	rollbackCount = 0;
	commitCount = 0;
	private snapshot: { tags: string[]; order: string[] } | null = null;

	constructor(private readonly onExecute?: ExecuteHook) {}

	async execute(sql: string) {
		this.onExecute?.(sql);
		return { changes: { changes: 0 } };
	}

	async query(sql: string) {
		if (/FROM migrations/i.test(sql)) {
			return { values: [...this.appliedTags].map((tag) => ({ tag })) };
		}
		return { values: [] };
	}

	async run(sql: string, values: unknown[] = []) {
		if (/INSERT INTO migrations/i.test(sql)) {
			const tag = values[0] as string;
			this.appliedTags.add(tag);
			this.appliedOrder.push(tag);
		}
		return { changes: { changes: 1 } };
	}

	async beginTransaction() {
		this.snapshot = { tags: [...this.appliedTags], order: [...this.appliedOrder] };
		return { changes: { changes: 0 } };
	}

	async commitTransaction() {
		this.commitCount++;
		this.snapshot = null;
		return { changes: { changes: 0 } };
	}

	async rollbackTransaction() {
		this.rollbackCount++;
		if (this.snapshot) {
			this.appliedTags = new Set(this.snapshot.tags);
			this.appliedOrder = this.snapshot.order;
			this.snapshot = null;
		}
		return { changes: { changes: 0 } };
	}
}

const asConnection = (fake: FakeSQLiteConnection) => fake as unknown as SQLiteDBConnection;

describe('runDatabaseMigrations', () => {
	it('applies every journal migration once, in idx order', async () => {
		const db = new FakeSQLiteConnection();
		await runDatabaseMigrations(asConnection(db));

		expect(db.appliedOrder).toEqual(orderedTags);
		expect(db.commitCount).toBe(orderedTags.length);
		expect(db.rollbackCount).toBe(0);
	});

	it('is idempotent — a second run applies nothing new', async () => {
		const db = new FakeSQLiteConnection();
		await runDatabaseMigrations(asConnection(db));
		await runDatabaseMigrations(asConnection(db));

		// no duplicates, no extra commits beyond the first run
		expect(db.appliedOrder).toEqual(orderedTags);
		expect(db.commitCount).toBe(orderedTags.length);
	});

	it('rolls back and rethrows when a statement fails, leaving its tag unrecorded', async () => {
		const lastTag = orderedTags[orderedTags.length - 1];
		// only the final migration is pending; throw on its first real statement
		// (the runner's own bookkeeping CREATE is the one mentioning "migrations (tag")
		const db = new FakeSQLiteConnection((sql) => {
			if (!sql.includes('migrations (tag')) throw new Error('statement boom');
		});
		for (const tag of orderedTags.slice(0, -1)) db.appliedTags.add(tag);

		await expect(runDatabaseMigrations(asConnection(db))).rejects.toThrow('statement boom');

		expect(db.rollbackCount).toBe(1);
		expect(db.commitCount).toBe(0);
		expect(db.appliedTags.has(lastTag)).toBe(false);
		expect(db.appliedOrder).toEqual([]); // the failed insert never landed
	});
});

describe('0013_tester_type backfill', () => {
	const statements = (sql: string) =>
		sql
			.split('--> statement-breakpoint')
			.map((statement) => statement.trim())
			.filter(Boolean);

	it('maps catalogue + legacy names to their type; custom rows stay strips', async () => {
		const SQL = await initSqlJs();
		const db = new SQL.Database();
		// only the testers CREATE from 0012 — the profile half needs earlier migrations
		db.run(statements(createTestersSql)[0]);

		const preMigrationNames = [
			'Test strips',
			'Drop test kit',
			'Salt meter',
			'AquaChek 7-in-1',
			'Taylor K-2006',
			'My Custom Kit'
		];
		for (const name of preMigrationNames) {
			db.run('INSERT INTO testers (name, measures, created_at) VALUES (?, ?, ?)', [name, '[]', 0]);
		}

		for (const statement of statements(testerTypeSql)) db.run(statement);

		const rows = db.exec('SELECT name, type FROM testers ORDER BY id')[0].values;
		expect(Object.fromEntries(rows)).toEqual({
			'Test strips': 'strips',
			'Drop test kit': 'drops',
			'Salt meter': 'meter',
			'AquaChek 7-in-1': 'strips',
			'Taylor K-2006': 'drops',
			'My Custom Kit': 'strips'
		});
		db.close();
	});
});
