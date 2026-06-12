import { sqliteTable, integer, real, text } from 'drizzle-orm/sqlite-core';
import { HARDNESS_UNITS, TEMPERATURE_UNITS, VOLUME_UNITS } from '../units';

// Single-row table (id = 1): the pool profile collected during onboarding
export const profileTable = sqliteTable('profile', {
	id: integer('id').primaryKey(),
	onboarded: integer('onboarded', { mode: 'boolean' }).notNull().default(false),
	name: text('name').notNull().default('My pool'),
	shape: text('shape').notNull(),
	// canonical count in volumeUnit — formatting ("50,000") happens at the repository boundary
	volume: integer('volume'),
	surface: text('surface').notNull(),
	sanitiser: text('sanitiser').notNull(),
	filter: text('filter').notNull(),
	unitsPreset: text('units_preset').notNull(),
	volumeUnit: text('volume_unit', { enum: VOLUME_UNITS }).notNull(),
	hardnessUnit: text('hardness_unit', { enum: HARDNESS_UNITS }).notNull(),
	temperatureUnit: text('temperature_unit', { enum: TEMPERATURE_UNITS }).notNull(),
	tester: text('tester').notNull(),
	reminderDays: integer('reminder_days').notNull().default(3)
});

// One row per logged water test; blank readings stay null.
// Alkalinity/hardness are stored AS ENTERED with their own unit columns;
// chemistry.testValue() normalizes to ppm for computation. Temperature in °C.
export const testsTable = sqliteTable('tests', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	testedAt: integer('tested_at', { mode: 'timestamp_ms' }).notNull(),
	tester: text('tester').notNull(),
	ph: real('ph'),
	freeChlorine: real('free_chlorine'),
	totalAlkalinity: real('total_alkalinity'),
	totalAlkalinityUnit: text('total_alkalinity_unit', { enum: HARDNESS_UNITS })
		.notNull()
		.default('ppm'),
	calciumHardness: real('calcium_hardness'),
	calciumHardnessUnit: text('calcium_hardness_unit', { enum: HARDNESS_UNITS })
		.notNull()
		.default('ppm'),
	cyanuricAcid: real('cyanuric_acid'),
	temperature: real('temperature')
});

// Care issues being worked through (content will come from the resolution pipeline)
export const issuesTable = sqliteTable('issues', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	statusKey: text('status_key').notNull(), // palette status colour: 'high' | 'ok' | 'low' | 'info'
	subtitle: text('subtitle').notNull(), // e.g. "Next: run pump 24h"
	banner: text('banner'), // timeline status banner, e.g. "Improving. Clarity up since the shock…"
	progress: real('progress').notNull().default(0), // 0..1
	expectedDays: integer('expected_days'),
	startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
	resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' })
});

// Timeline entries belonging to an issue
export const issueEventsTable = sqliteTable('issue_events', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	issueId: integer('issue_id')
		.notNull()
		.references(() => issuesTable.id),
	orderIndex: integer('order_index').notNull(),
	title: text('title').notNull(),
	whenLabel: text('when_label'), // display text when not derivable, e.g. "Day 3 · upcoming"
	happenedAt: integer('happened_at', { mode: 'timestamp_ms' }),
	state: text('state').notNull() // 'done' | 'active' | 'upcoming'
});

// Actions the user has taken (dosing, maintenance…) — manually logged or
// recorded while working an issue (issueId set). Shown in the /log journal.
export const actionsTable = sqliteTable('actions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	performedAt: integer('performed_at', { mode: 'timestamp_ms' }).notNull(),
	title: text('title').notNull(),
	detail: text('detail'),
	issueId: integer('issue_id').references(() => issuesTable.id)
});

export type ProfileRow = typeof profileTable.$inferSelect;
export type NewProfileRow = typeof profileTable.$inferInsert;
export type TestRow = typeof testsTable.$inferSelect;
export type NewTestRow = typeof testsTable.$inferInsert;
export type IssueRow = typeof issuesTable.$inferSelect;
export type NewIssueRow = typeof issuesTable.$inferInsert;
export type IssueEventRow = typeof issueEventsTable.$inferSelect;
export type NewIssueEventRow = typeof issueEventsTable.$inferInsert;
export type ActionRow = typeof actionsTable.$inferSelect;
export type NewActionRow = typeof actionsTable.$inferInsert;
