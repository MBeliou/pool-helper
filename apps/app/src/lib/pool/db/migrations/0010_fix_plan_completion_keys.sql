ALTER TABLE `actions` ADD `source_test_id` integer REFERENCES tests(id);--> statement-breakpoint
ALTER TABLE `actions` ADD `parameter_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `actions_plan_step_unique` ON `actions` (`source_test_id`,`parameter_key`);