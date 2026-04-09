CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(255),
	`source` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`company` varchar(255) NOT NULL,
	`description` text,
	`city` varchar(100),
	`state` varchar(2),
	`address` varchar(255),
	`zipCode` varchar(20),
	`email` varchar(255),
	`phone` varchar(20),
	`website` varchar(255),
	`logoUrl` varchar(255),
	`categories` text,
	`locations` text,
	`status` enum('pending','approved','rejected','published') NOT NULL DEFAULT 'pending',
	`wpPostId` int,
	`sourceUrl` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wpCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`wpUrl` varchar(255) NOT NULL,
	`wpUsername` varchar(255) NOT NULL,
	`wpAppPassword` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`lastTestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wpCredentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `wpCredentials` ADD CONSTRAINT `wpCredentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;