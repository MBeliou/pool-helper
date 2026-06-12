ALTER TABLE `profile` ADD `name` text DEFAULT 'My pool' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `reminder_days` integer DEFAULT 3 NOT NULL;