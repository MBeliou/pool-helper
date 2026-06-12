CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`onboarded` integer DEFAULT false NOT NULL,
	`shape` text NOT NULL,
	`volume` integer,
	`surface` text NOT NULL,
	`sanitiser` text NOT NULL,
	`filter` text NOT NULL,
	`units_preset` text NOT NULL,
	`volume_unit` text NOT NULL,
	`hardness_unit` text NOT NULL,
	`temperature_unit` text NOT NULL,
	`tester` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tested_at` integer NOT NULL,
	`tester` text NOT NULL,
	`ph` real,
	`free_chlorine` real,
	`total_alkalinity` real,
	`calcium_hardness` real,
	`cyanuric_acid` real
);
