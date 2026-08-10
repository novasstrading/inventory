CREATE TABLE `asset_documents` (
	`id` char(26) NOT NULL,
	`asset_id` char(26) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`original_name` varchar(255),
	`content_type` varchar(100),
	`size_bytes` int,
	`doc_type` enum('pdf','image') NOT NULL,
	`uploaded_by` char(26),
	`uploaded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime(3),
	CONSTRAINT `asset_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_photos` (
	`id` char(26) NOT NULL,
	`asset_id` char(26) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`original_name` varchar(255),
	`content_type` varchar(100),
	`size_bytes` int,
	`uploaded_by` char(26),
	`uploaded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime(3),
	CONSTRAINT `asset_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` char(26) NOT NULL,
	`legacy_id` varchar(64),
	`code` varchar(20),
	`type` enum('hardware','software') NOT NULL,
	`category_id` char(26) NOT NULL,
	`name` varchar(200) NOT NULL,
	`brand_model` varchar(200),
	`serial` varchar(150),
	`specs` varchar(500),
	`vendor` varchar(150),
	`purchase_date` date,
	`value_amount` decimal(12,2),
	`value_currency` enum('BDT','USD') NOT NULL DEFAULT 'BDT',
	`value_type` enum('one_time','monthly','yearly') NOT NULL DEFAULT 'one_time',
	`employee_id` char(26),
	`location` varchar(200),
	`status` enum('active','removed') NOT NULL DEFAULT 'active',
	`notes_enc` varbinary(2048),
	`created_by` char(26),
	`updated_by` char(26),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `assets_legacy_id_unique` UNIQUE(`legacy_id`),
	CONSTRAINT `assets_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` char(26) NOT NULL,
	`actor_user_id` char(26),
	`actor_email` varchar(190),
	`action` varchar(60) NOT NULL,
	`entity_type` varchar(40) NOT NULL,
	`entity_id` varchar(64),
	`meta` json,
	`ip_address` varchar(45),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` char(26) NOT NULL,
	`name` varchar(80) NOT NULL,
	`kind` enum('hardware','software') NOT NULL,
	`code_tag` char(2),
	`sort_order` smallint NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `code_counters` (
	`tag` char(2) NOT NULL,
	`counter` int NOT NULL DEFAULT 0,
	CONSTRAINT `code_counters_tag` PRIMARY KEY(`tag`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` char(26) NOT NULL,
	`legacy_id` varchar(64),
	`name` varchar(150) NOT NULL,
	`designation` varchar(150),
	`contact_enc` varbinary(512),
	`email_enc` varbinary(512),
	`photo_key` varchar(255),
	`status` enum('active','released') NOT NULL DEFAULT 'active',
	`released_at` datetime(3),
	`released_by` char(26),
	`released_note` varchar(500),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_legacy_id_unique` UNIQUE(`legacy_id`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`email` varchar(190) NOT NULL,
	`code_hash` char(64) NOT NULL,
	`attempts` tinyint NOT NULL DEFAULT 0,
	`sent_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	CONSTRAINT `otp_codes_email` PRIMARY KEY(`email`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`rl_key` varchar(190) NOT NULL,
	`window_start` datetime(3) NOT NULL,
	`count` smallint NOT NULL DEFAULT 1,
	CONSTRAINT `rate_limits_rl_key` PRIMARY KEY(`rl_key`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(26) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`user_id` char(26) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`last_seen_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`expires_at` datetime(3) NOT NULL,
	`user_agent` varchar(255),
	`ip_address` varchar(45),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `stickers` (
	`id` char(26) NOT NULL,
	`asset_id` char(26) NOT NULL,
	`label` varchar(80) NOT NULL,
	`label_slug` varchar(80) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`created_by` char(26),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stickers_id` PRIMARY KEY(`id`),
	CONSTRAINT `stickers_asset_label_idx` UNIQUE(`asset_id`,`label_slug`)
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` char(26) NOT NULL,
	`asset_id` char(26) NOT NULL,
	`code` varchar(20),
	`asset_name` varchar(200) NOT NULL,
	`from_employee_id` char(26),
	`to_employee_id` char(26),
	`from_label` varchar(150) NOT NULL,
	`to_label` varchar(150) NOT NULL,
	`from_location` varchar(200),
	`to_location` varchar(200),
	`by_user_id` char(26),
	`by_email` varchar(190) NOT NULL,
	`notes` varchar(500),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(26) NOT NULL,
	`email` varchar(190) NOT NULL,
	`role` enum('admin','viewer') NOT NULL DEFAULT 'viewer',
	`protected` boolean NOT NULL DEFAULT false,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`created_by` char(26),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `asset_documents` ADD CONSTRAINT `asset_documents_asset_id_assets_id_fk` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asset_documents` ADD CONSTRAINT `asset_documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asset_photos` ADD CONSTRAINT `asset_photos_asset_id_assets_id_fk` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asset_photos` ADD CONSTRAINT `asset_photos_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_released_by_users_id_fk` FOREIGN KEY (`released_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stickers` ADD CONSTRAINT `stickers_asset_id_assets_id_fk` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stickers` ADD CONSTRAINT `stickers_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_asset_id_assets_id_fk` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_from_employee_id_employees_id_fk` FOREIGN KEY (`from_employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_to_employee_id_employees_id_fk` FOREIGN KEY (`to_employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_by_user_id_users_id_fk` FOREIGN KEY (`by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `asset_documents_asset_id_idx` ON `asset_documents` (`asset_id`);--> statement-breakpoint
CREATE INDEX `asset_photos_asset_id_idx` ON `asset_photos` (`asset_id`);--> statement-breakpoint
CREATE INDEX `assets_category_id_idx` ON `assets` (`category_id`);--> statement-breakpoint
CREATE INDEX `assets_employee_id_idx` ON `assets` (`employee_id`);--> statement-breakpoint
CREATE INDEX `assets_status_idx` ON `assets` (`status`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_log_created_at_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `employees_name_idx` ON `employees` (`name`);--> statement-breakpoint
CREATE INDEX `employees_status_idx` ON `employees` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `transfers_asset_id_idx` ON `transfers` (`asset_id`);--> statement-breakpoint
CREATE INDEX `transfers_code_idx` ON `transfers` (`code`);--> statement-breakpoint
CREATE INDEX `transfers_created_at_idx` ON `transfers` (`created_at`);