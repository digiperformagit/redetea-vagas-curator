CREATE TABLE `simple_auth_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`email` varchar(320),
	`is_active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `simple_auth_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `simple_auth_users_username_unique` UNIQUE(`username`)
);
