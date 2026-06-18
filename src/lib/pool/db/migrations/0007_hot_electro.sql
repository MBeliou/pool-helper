CREATE TABLE `diagnoses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer NOT NULL,
	`symptoms` text NOT NULL,
	`answers` text NOT NULL,
	`top_cause_title` text NOT NULL,
	`top_cause_percent` integer NOT NULL,
	`top_cause_status` text NOT NULL,
	`top_cause_fix` text NOT NULL,
	`issue_id` integer,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE no action
);
