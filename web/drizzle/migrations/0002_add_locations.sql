CREATE TABLE `locations` (
	`id` char(26) NOT NULL,
	`name` varchar(200) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `locations_name_unique` UNIQUE(`name`)
);
