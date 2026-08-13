CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`email` text NOT NULL,
	`state` text NOT NULL,
	`nickname` text,
	`language` text DEFAULT 'pt-BR' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`content` text NOT NULL,
	`importance` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`path` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model` text DEFAULT 'llama3.2:1b' NOT NULL,
	`language` text DEFAULT 'pt-BR' NOT NULL,
	`wake_word` text DEFAULT 'jarvis' NOT NULL,
	`voice` text DEFAULT 'pt_BR-faber-medium' NOT NULL,
	`volume` integer DEFAULT 80 NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
