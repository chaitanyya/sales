CREATE TABLE `lead_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`config_id` integer NOT NULL,
	`passes_requirements` integer NOT NULL,
	`requirement_results` text NOT NULL,
	`total_score` integer NOT NULL,
	`score_breakdown` text NOT NULL,
	`tier` text NOT NULL,
	`scoring_notes` text,
	`scored_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`config_id`) REFERENCES `scoring_config`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scoring_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT 'default' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`required_characteristics` text NOT NULL,
	`demand_signifiers` text NOT NULL,
	`tier_hot_min` integer DEFAULT 80 NOT NULL,
	`tier_warm_min` integer DEFAULT 50 NOT NULL,
	`tier_nurture_min` integer DEFAULT 30 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
