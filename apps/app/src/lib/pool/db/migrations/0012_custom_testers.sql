CREATE TABLE `testers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`measures` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `profile` ADD `tester_setup_done` integer DEFAULT false NOT NULL;