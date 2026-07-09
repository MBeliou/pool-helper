ALTER TABLE `testers` ADD `type` text DEFAULT 'strips' NOT NULL;
--> statement-breakpoint
UPDATE `testers` SET `type` = 'drops' WHERE `name` IN ('Drop test kit', 'Taylor K-2006');
--> statement-breakpoint
UPDATE `testers` SET `type` = 'meter' WHERE `name` = 'Salt meter';
