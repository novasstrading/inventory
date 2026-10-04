ALTER TABLE `users` ADD `modules` varchar(64) DEFAULT 'assets' NOT NULL;
--> statement-breakpoint
UPDATE `users` SET `modules` = 'website,assets' WHERE `role` = 'admin';