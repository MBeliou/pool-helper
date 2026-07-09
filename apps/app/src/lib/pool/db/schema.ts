import { sqliteTable, integer, real, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { HARDNESS_UNITS, TEMPERATURE_UNITS, VOLUME_UNITS } from '../units';

// Single-row table (id = 1): the pool profile collected during onboarding
export const profileTable = sqliteTable('profile', {
	id: integer('id').primaryKey(),
	onboarded: integer('onboarded', { mode: 'boolean' }).notNull().default(false),
	name: text('name').notNull().default('My pool'),
	shape: text('shape').notNull(),
	// pool volume as a real number in volumeUnit (REAL so e.g. 9.7 m³ is exact);
	// formatting for display happens at render, never in storage
	volume: real('volume'),
	surface: text('surface').notNull(),
	sanitiser: text('sanitiser').notNull(),
	// indoor pools see no UV (stabiliser logic changes); sun exposure refines
	// the CYA target for outdoor pools
	location: text('location').notNull().default('Outdoor'),
	sunExposure: text('sun_exposure').notNull().default('Full sun'),
	filter: text('filter').notNull(),
	unitsPreset: text('units_preset').notNull(),
	volumeUnit: text('volume_unit', { enum: VOLUME_UNITS }).notNull(),
	hardnessUnit: text('hardness_unit', { enum: HARDNESS_UNITS }).notNull(),
	temperatureUnit: text('temperature_unit', { enum: TEMPERATURE_UNITS }).notNull(),
	tester: text('tester').notNull(),
	reminderDays: integer('reminder_days').notNull().default(3),
	// when the user acknowledged the dosing disclaimer (null = not yet)
	disclaimerAcceptedAt: integer('disclaimer_accepted_at', { mode: 'timestamp_ms' })
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

// One row per completed diagnose-wizard run. Captures the inputs (symptoms,
// clarifying answers) and the placeholder "top cause" the wizard surfaced, then
// links to the issue created from it. Real ranking arrives with the resolution
// pipeline; this table is the durable record + the seam it will write through.
export const diagnosesTable = sqliteTable('diagnoses', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	symptoms: text('symptoms').notNull(), // JSON string[] of symptom kinds
	answers: text('answers').notNull(), // JSON number[] of selected option indices
	topCauseTitle: text('top_cause_title').notNull(),
	topCausePercent: integer('top_cause_percent').notNull(),
	topCauseStatus: text('top_cause_status').notNull(), // palette status key
	topCauseFix: text('top_cause_fix').notNull(),
	issueId: integer('issue_id').references(() => issuesTable.id)
});

// Actions the user has taken (dosing, maintenance…) — manually logged or
// recorded while working an issue (issueId set). Shown in the /log journal.
// Fix-plan completions carry (sourceTestId, parameterKey) — a unique pair, so
// re-tapping "Mark all done" can never journal the same plan step twice.
export const actionsTable = sqliteTable(
	'actions',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		performedAt: integer('performed_at', { mode: 'timestamp_ms' }).notNull(),
		title: text('title').notNull(),
		detail: text('detail'),
		issueId: integer('issue_id').references(() => issuesTable.id),
		// set only for fix-plan steps: the test the plan was derived from + the
		// parameter the step adjusted (NULL pairs are never constrained in SQLite)
		sourceTestId: integer('source_test_id').references(() => testsTable.id),
		parameterKey: text('parameter_key')
	},
	(table) => [uniqueIndex('actions_plan_step_unique').on(table.sourceTestId, table.parameterKey)]
);

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
export type DiagnosisRow = typeof diagnosesTable.$inferSelect;
export type NewDiagnosisRow = typeof diagnosesTable.$inferInsert;
