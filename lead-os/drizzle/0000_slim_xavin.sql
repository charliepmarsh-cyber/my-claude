CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`entity` text NOT NULL,
	`entity_id` text,
	`action` text NOT NULL,
	`detail` text,
	`actor` text DEFAULT 'user' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activities_lead_idx` ON `activities` (`lead_id`);--> statement-breakpoint
CREATE INDEX `activities_created_idx` ON `activities` (`created_at`);--> statement-breakpoint
CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`purpose` text NOT NULL,
	`provider` text NOT NULL,
	`model` text,
	`prompt_version` text,
	`lead_id` text,
	`input_summary` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost_estimate_usd` real,
	`duration_ms` integer,
	`status` text NOT NULL,
	`error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_runs_created_idx` ON `ai_runs` (`created_at`);--> statement-breakpoint
CREATE TABLE `automation_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`discovery_id` text,
	`title` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`business_problem` text,
	`current_state` text,
	`future_state` text,
	`deterministic_steps` text,
	`ai_steps` text,
	`human_steps` text,
	`integrations` text,
	`credentials_needed` text,
	`data_model` text,
	`exception_handling` text,
	`security_considerations` text,
	`risks` text,
	`complexity` text DEFAULT 'M' NOT NULL,
	`time_saved_hours_month` real,
	`revenue_impact` text,
	`error_reduction` text,
	`measurement_plan` text,
	`mvp_scope` text,
	`phase2_scope` text,
	`recommended_stack` text,
	`deliverable_now` integer DEFAULT true NOT NULL,
	`missing_skills` text,
	`case_study_suitable` integer DEFAULT false NOT NULL,
	`commercial_model` text DEFAULT 'undecided' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`generation_source` text DEFAULT 'human' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `auto_opps_lead_idx` ON `automation_opportunities` (`lead_id`);--> statement-breakpoint
CREATE TABLE `buying_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`signal_type` text NOT NULL,
	`description` text NOT NULL,
	`evidence_url` text,
	`strength` text DEFAULT 'moderate' NOT NULL,
	`observed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `signals_lead_idx` ON `buying_signals` (`lead_id`);--> statement-breakpoint
CREATE TABLE `case_studies` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`opportunity_id` text,
	`automation_opportunity_id` text,
	`company_name` text NOT NULL,
	`problem` text,
	`baseline` text,
	`proposed_build` text,
	`success_metric` text,
	`data_required` text,
	`approval_status` text DEFAULT 'not_asked' NOT NULL,
	`build_status` text DEFAULT 'not_started' NOT NULL,
	`before_evidence` text,
	`after_evidence` text,
	`time_saved` text,
	`revenue_influenced` text,
	`error_reduction` text,
	`qualitative_feedback` text,
	`testimonial_status` text DEFAULT 'not_asked' NOT NULL,
	`permission_to_publish` integer DEFAULT false NOT NULL,
	`redaction_requirements` text,
	`referral_requested` integer DEFAULT false NOT NULL,
	`paid_follow_on` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`automation_opportunity_id`) REFERENCES `automation_opportunities`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `case_studies_lead_idx` ON `case_studies` (`lead_id`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`website` text,
	`linkedin_url` text,
	`description` text,
	`industry` text,
	`sub_industry` text,
	`employee_range` text,
	`revenue_range` text,
	`ecommerce_platform` text,
	`shopify_status` text DEFAULT 'unknown',
	`other_technologies` text,
	`business_model` text DEFAULT 'unknown',
	`sales_channels` text,
	`markets` text,
	`data_source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `companies_name_idx` ON `companies` (`name`);--> statement-breakpoint
CREATE TABLE `conversation_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`direction` text NOT NULL,
	`entry_type` text NOT NULL,
	`content` text NOT NULL,
	`attachment_name` text,
	`message_id` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `entries_conversation_idx` ON `conversation_entries` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `entries_lead_idx` ON `conversation_entries` (`lead_id`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`channel` text DEFAULT 'linkedin' NOT NULL,
	`stage` text,
	`is_peer_conversation` integer DEFAULT false NOT NULL,
	`started_at` integer NOT NULL,
	`last_entry_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `conversations_lead_idx` ON `conversations` (`lead_id`);--> statement-breakpoint
CREATE TABLE `discoveries` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`problem_statement` text,
	`current_workflow` text,
	`trigger` text,
	`inputs` text,
	`steps` text,
	`tools` text,
	`people_involved` text,
	`process_owner` text,
	`decision_points` text,
	`exceptions` text,
	`outputs` text,
	`volume` text,
	`frequency` text,
	`time_consumed` text,
	`error_rate` text,
	`cost_estimate` text,
	`revenue_impact` text,
	`customer_impact` text,
	`compliance_risk` text,
	`human_judgement` text,
	`desired_outcome` text,
	`constraints` text,
	`access_required` text,
	`data_sensitivity` text,
	`success_metrics` text,
	`completeness` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `discoveries_lead_idx` ON `discoveries` (`lead_id`);--> statement-breakpoint
CREATE TABLE `import_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`import_id` text NOT NULL,
	`row_num` integer NOT NULL,
	`raw` text,
	`outcome` text NOT NULL,
	`lead_id` text,
	`message` text,
	`prior_snapshot` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`import_id`) REFERENCES `imports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `import_rows_import_idx` ON `import_rows` (`import_id`);--> statement-breakpoint
CREATE TABLE `imports` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`created_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`skipped_count` integer DEFAULT 0 NOT NULL,
	`duplicate_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`mapping` text,
	`status` text DEFAULT 'complete' NOT NULL,
	`undone_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lead_tags` (
	`lead_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`lead_id`, `tag_id`),
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`preferred_name` text,
	`pronouns` text,
	`linkedin_url` text,
	`avatar_url` text,
	`work_email` text,
	`personal_email` text,
	`phone` text,
	`location` text,
	`timezone` text,
	`job_title` text,
	`seniority` text DEFAULT 'unknown',
	`department` text,
	`decision_authority` text DEFAULT 'unknown',
	`is_founder` integer DEFAULT false NOT NULL,
	`years_in_role` real,
	`previous_roles` text,
	`company_id` text,
	`source` text,
	`warmth` text DEFAULT 'cold' NOT NULL,
	`connection_degree` text DEFAULT 'unknown',
	`how_known` text,
	`relationship_strength` integer,
	`referrer` text,
	`shared_connections` text,
	`shared_groups` text,
	`trust_indicators` text,
	`last_interaction_at` integer,
	`interaction_count` integer DEFAULT 0 NOT NULL,
	`icp_category` text DEFAULT 'other',
	`recommended_angle` text,
	`ai_summary` text,
	`notes` text,
	`likely_objections` text,
	`current_tools` text,
	`status` text DEFAULT 'imported' NOT NULL,
	`priority_label` text,
	`channel` text DEFAULT 'linkedin',
	`last_contacted_at` integer,
	`next_action` text,
	`next_action_due` integer,
	`follow_up_count` integer DEFAULT 0 NOT NULL,
	`reply_sentiment` text,
	`conversation_stage` text,
	`meeting_status` text DEFAULT 'none',
	`opportunity_value` real,
	`probability` real,
	`proposed_service` text,
	`case_study_suitability` integer,
	`paid_suitability` integer,
	`retainer_suitability` integer,
	`referral_potential` integer,
	`strategic_value` text,
	`data_source` text DEFAULT 'manual' NOT NULL,
	`do_not_contact` integer DEFAULT false NOT NULL,
	`suppression_reason` text,
	`completeness` integer DEFAULT 0 NOT NULL,
	`overall_score` integer,
	`duplicate_of_id` text,
	`closed_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `leads_priority_idx` ON `leads` (`priority_label`);--> statement-breakpoint
CREATE INDEX `leads_company_idx` ON `leads` (`company_id`);--> statement-breakpoint
CREATE INDEX `leads_next_action_due_idx` ON `leads` (`next_action_due`);--> statement-breakpoint
CREATE INDEX `leads_overall_score_idx` ON `leads` (`overall_score`);--> statement-breakpoint
CREATE INDEX `leads_full_name_idx` ON `leads` (`full_name`);--> statement-breakpoint
CREATE INDEX `leads_dnc_idx` ON `leads` (`do_not_contact`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`msg_type` text NOT NULL,
	`channel` text DEFAULT 'linkedin' NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`evidence_used` text,
	`generation_source` text DEFAULT 'rules' NOT NULL,
	`generation_controls` text,
	`prompt_version` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`version_num` integer DEFAULT 1 NOT NULL,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_lead_idx` ON `messages` (`lead_id`);--> statement-breakpoint
CREATE INDEX `messages_status_idx` ON `messages` (`status`);--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`automation_opportunity_id` text,
	`title` text NOT NULL,
	`stage` text DEFAULT 'qualified' NOT NULL,
	`delivery_stage` text,
	`value` real,
	`probability` real,
	`proposed_service` text,
	`notes` text,
	`won_at` integer,
	`lost_at` integer,
	`lost_reason` text,
	`on_hold_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`automation_opportunity_id`) REFERENCES `automation_opportunities`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `opps_lead_idx` ON `opportunities` (`lead_id`);--> statement-breakpoint
CREATE INDEX `opps_stage_idx` ON `opportunities` (`stage`);--> statement-breakpoint
CREATE TABLE `pain_hypotheses` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`category` text NOT NULL,
	`hypothesis` text NOT NULL,
	`evidence` text,
	`evidence_url` text,
	`confidence` text DEFAULT 'low' NOT NULL,
	`impact` text DEFAULT 'medium' NOT NULL,
	`discovery_question` text,
	`automation_direction` text,
	`human_judgement_note` text,
	`status` text DEFAULT 'proposed' NOT NULL,
	`source` text DEFAULT 'human' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pain_lead_idx` ON `pain_hypotheses` (`lead_id`);--> statement-breakpoint
CREATE TABLE `reply_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`classification` text NOT NULL,
	`confidence` text DEFAULT 'low' NOT NULL,
	`explicit_problem` text,
	`implied_pain` text,
	`current_process` text,
	`frequency` text,
	`consequence` text,
	`tools_mentioned` text,
	`authority_signal` text,
	`interest_level` text DEFAULT 'unclear' NOT NULL,
	`tech_sophistication` text,
	`human_judgement_areas` text,
	`possible_objections` text,
	`recommended_next_question` text,
	`next_question_reason` text,
	`recommendation` text DEFAULT 'continue_discovery' NOT NULL,
	`analysis_source` text DEFAULT 'rules' NOT NULL,
	`rationale` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `conversation_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reply_analyses_lead_idx` ON `reply_analyses` (`lead_id`);--> statement-breakpoint
CREATE TABLE `research_items` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`kind` text DEFAULT 'note' NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`source_url` text,
	`confidence` text DEFAULT 'medium' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `research_lead_idx` ON `research_items` (`lead_id`);--> statement-breakpoint
CREATE TABLE `saved_filters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`params` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`dimension` text NOT NULL,
	`value` integer NOT NULL,
	`calculated_by` text DEFAULT 'rules' NOT NULL,
	`breakdown` text,
	`manual_reason` text,
	`computed_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scores_lead_dimension_idx` ON `scores` (`lead_id`,`dimension`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stage_history` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`lead_id` text,
	`from_stage` text,
	`to_stage` text NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stage_history_entity_idx` ON `stage_history` (`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `suppression_records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppression_kind_value_idx` ON `suppression_records` (`kind`,`value`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'blue' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`kind` text DEFAULT 'custom' NOT NULL,
	`title` text NOT NULL,
	`detail` text,
	`due_at` integer,
	`snoozed_until` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `tasks` (`due_at`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_lead_idx` ON `tasks` (`lead_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'founder' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `workflow_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`from_key` text NOT NULL,
	`to_key` text NOT NULL,
	`label` text,
	`kind` text DEFAULT 'normal' NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `automation_opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wf_edges_opp_idx` ON `workflow_edges` (`opportunity_id`);--> statement-breakpoint
CREATE TABLE `workflow_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`node_key` text NOT NULL,
	`label` text NOT NULL,
	`kind` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `automation_opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wf_nodes_opp_idx` ON `workflow_nodes` (`opportunity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `wf_nodes_opp_key_idx` ON `workflow_nodes` (`opportunity_id`,`node_key`);