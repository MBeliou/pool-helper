import { Capacitor } from '@capacitor/core';
import {
	CapacitorSQLite,
	SQLiteConnection,
	type SQLiteDBConnection
} from '@capacitor-community/sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { runDatabaseMigrations } from './migrations';
import * as schema from './schema';

const DATABASE_NAME = 'pool-helper';

let databaseConnection: SQLiteDBConnection | undefined;
// single-flight guard: HMR / repeated onMount must not open a second connection
let initializationPromise: Promise<void> | undefined;

async function initializeWebPlatform(sqliteConnection: SQLiteConnection): Promise<void> {
	const { defineCustomElements } = await import('jeep-sqlite/loader');
	defineCustomElements(window);
	if (!document.querySelector('jeep-sqlite')) {
		const jeepSqliteElement = document.createElement('jeep-sqlite') as HTMLElement & {
			autoSave: boolean;
		};
		jeepSqliteElement.autoSave = true; // persist to IndexedDB after each write
		document.body.appendChild(jeepSqliteElement);
	}
	await customElements.whenDefined('jeep-sqlite');
	// fetches /assets/sql-wasm.wasm and backs the database with IndexedDB
	await sqliteConnection.initWebStore();
}

export async function initializeDatabase(): Promise<void> {
	if (initializationPromise) return initializationPromise;
	initializationPromise = (async () => {
		const sqliteConnection = new SQLiteConnection(CapacitorSQLite);
		const isWebPlatform = Capacitor.getPlatform() === 'web';
		if (isWebPlatform) await initializeWebPlatform(sqliteConnection);

		const consistency = await sqliteConnection.checkConnectionsConsistency();
		const hasExistingConnection = (await sqliteConnection.isConnection(DATABASE_NAME, false))
			.result;
		databaseConnection =
			consistency.result && hasExistingConnection
				? await sqliteConnection.retrieveConnection(DATABASE_NAME, false)
				: await sqliteConnection.createConnection(
						DATABASE_NAME,
						false,
						'no-encryption',
						1,
						false
					);
		await databaseConnection.open();
		await runDatabaseMigrations(databaseConnection);
		if (isWebPlatform) await sqliteConnection.saveToStore(DATABASE_NAME);
	})();
	return initializationPromise;
}

// drizzle expects positional value arrays; the plugin returns row objects.
// Safe here because drizzle emits explicit column lists and we never join tables.
function rowObjectToValueArray(rowObject: Record<string, unknown>): unknown[] {
	return Object.values(rowObject);
}

export const database = drizzle(
	async (sql, params, method) => {
		if (!databaseConnection) {
			throw new Error('Database accessed before initializeDatabase() completed');
		}
		if (method === 'run') {
			await databaseConnection.run(sql, params as unknown[], false);
			return { rows: [] };
		}
		const result = await databaseConnection.query(sql, params as unknown[]);
		const rows = (result.values ?? []).map(rowObjectToValueArray);
		// 'get' expects a single flat row array
		return method === 'get' ? { rows: rows[0] ?? [] } : { rows };
	},
	{ schema }
);
