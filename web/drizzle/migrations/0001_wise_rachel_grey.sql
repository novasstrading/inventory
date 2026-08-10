ALTER TABLE `assets` MODIFY COLUMN `notes_enc` varchar(2800);--> statement-breakpoint
ALTER TABLE `employees` MODIFY COLUMN `contact_enc` varchar(700);--> statement-breakpoint
ALTER TABLE `employees` MODIFY COLUMN `email_enc` varchar(700);