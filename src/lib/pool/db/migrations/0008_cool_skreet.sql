PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`onboarded` integer DEFAULT false NOT NULL,
	`name` text DEFAULT 'My pool' NOT NULL,
	`shape` text NOT NULL,
	`volume` real,
	`surface` text NOT NULL,
	`sanitiser` text NOT NULL,
	`filter` text NOT NULL,
	`units_preset` text NOT NULL,
	`volume_unit` text NOT NULL,
	`hardness_unit` text NOT NULL,
	`temperature_unit` text NOT NULL,
	`tester` text NOT NULL,
	`reminder_days` integer DEFAULT 3 NOT NULL,
	`disclaimer_accepted_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_profile`("id", "onboarded", "name", "shape", "volume", "surface", "sanitiser", "filter", "units_preset", "volume_unit", "hardness_unit", "temperature_unit", "tester", "reminder_days", "disclaimer_accepted_at") SELECT "id", "onboarded", "name", "shape", "volume", "surface", "sanitiser", "filter", "units_preset", "volume_unit", "hardness_unit", "temperature_unit", "tester", "reminder_days", "disclaimer_accepted_at" FROM `profile`;--> statement-breakpoint
DROP TABLE `profile`;--> statement-breakpoint
ALTER TABLE `__new_profile` RENAME TO `profile`;--> statement-breakpoint
PRAGMA foreign_keys=ON;