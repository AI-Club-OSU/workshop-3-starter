CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`description` text,
	`open_graph_title` text,
	`open_graph_description` text,
	`twitter_title` text,
	`twitter_description` text,
	`canonical_url` text,
	`site_name` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_submissions_owner_user_id` ON `submissions` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `idx_submissions_updated_at` ON `submissions` (`updated_at`);--> statement-breakpoint
PRAGMA optimize;
