CREATE TABLE `issue_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`issue_id` integer NOT NULL,
	`order_index` integer NOT NULL,
	`title` text NOT NULL,
	`when_label` text,
	`happened_at` integer,
	`state` text NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`status_key` text NOT NULL,
	`subtitle` text NOT NULL,
	`banner` text,
	`progress` real DEFAULT 0 NOT NULL,
	`expected_days` integer,
	`started_at` integer NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
ALTER TABLE `tests` ADD `temperature` real;