CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text NOT NULL,
	`website` text,
	`industry` text,
	`sub_industry` text,
	`employees` integer,
	`employee_range` text,
	`revenue` real,
	`revenue_range` text,
	`company_linkedin_url` text,
	`city` text,
	`state` text,
	`country` text,
	`research_status` text DEFAULT 'pending',
	`researched_at` integer,
	`created_at` integer NOT NULL,
	`company_profile` text
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`title` text,
	`management_level` text,
	`linkedin_url` text,
	`year_joined` integer,
	`person_profile` text,
	`research_status` text DEFAULT 'pending',
	`researched_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text DEFAULT 'company' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
