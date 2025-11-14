CREATE TABLE "active_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" text NOT NULL,
	"ip_address" text NOT NULL,
	"city" text,
	"country" text,
	"country_code" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"user_agent" text,
	"device_info" text,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "active_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "admin_action_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"target_user_id" integer,
	"action" text NOT NULL,
	"previous_status" text,
	"new_status" text,
	"previous_plan" text,
	"new_plan" text,
	"expiration_date" timestamp,
	"reason" text,
	"duration" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_impersonation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"target_user_id" integer NOT NULL,
	"impersonation_token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "apple_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_name" text NOT NULL,
	"category_code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "available_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "available_variants_variant_id_unique" UNIQUE("variant_id")
);
--> statement-breakpoint
CREATE TABLE "custom_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"model" text NOT NULL,
	"variant" text,
	"storage" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_alert_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"urgency" text DEFAULT 'medium' NOT NULL,
	"sent_by" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"whatsapp" text NOT NULL,
	"accompanists" integer DEFAULT 1 NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer,
	"ip_address" text,
	"payment_status" text DEFAULT 'pending',
	"admin_confirmation_status" text DEFAULT 'pending',
	"confirmed_by_admin" integer,
	"admin_confirmed_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "feedback_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"feedback_type" varchar(50) NOT NULL,
	"is_required" boolean DEFAULT false,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"target_audience" varchar(50) DEFAULT 'all',
	"delay_seconds" integer DEFAULT 15
);
--> statement-breakpoint
CREATE TABLE "feedback_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_id" integer,
	"user_id" integer,
	"emoji_response" varchar(10),
	"text_response" text,
	"responded_at" timestamp with time zone DEFAULT now(),
	"user_email" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "interest_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_model" text NOT NULL,
	"product_brand" text NOT NULL,
	"product_storage" text NOT NULL,
	"product_color" text NOT NULL,
	"product_category" text,
	"product_capacity" text,
	"product_region" text,
	"supplier_name" text NOT NULL,
	"supplier_price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"date_added" text NOT NULL,
	"margin_value" numeric(10, 2),
	"margin_type" text DEFAULT 'percentage',
	"sales_price" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interest_list_user_id_product_model_product_brand_product_storage_product_color_supplier_name_unique" UNIQUE("user_id","product_model","product_brand","product_storage","product_color","supplier_name")
);
--> statement-breakpoint
CREATE TABLE "notification_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"alert_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" text,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"model" text NOT NULL,
	"threshold_price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_notified" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp,
	"email_notification" boolean DEFAULT true NOT NULL,
	"web_push_notification" boolean DEFAULT true NOT NULL,
	"brand" text,
	"capacity" text,
	"color" text,
	"region" text,
	"last_triggered_at" timestamp,
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"max_triggers" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_change_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"sheet_name" text NOT NULL,
	"row_index" integer NOT NULL,
	"model" text NOT NULL,
	"supplier" text NOT NULL,
	"old_price" numeric(10, 2) NOT NULL,
	"new_price" numeric(10, 2) NOT NULL,
	"price_drop" numeric(10, 2) NOT NULL,
	"drop_percentage" numeric(5, 2) NOT NULL,
	"was_moved_to_top" boolean DEFAULT false NOT NULL,
	"was_sheet_sorted" boolean DEFAULT false NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_drop_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"model" text NOT NULL,
	"storage" text,
	"color" text,
	"region" text,
	"supplier" text NOT NULL,
	"old_price" numeric(10, 2) NOT NULL,
	"new_price" numeric(10, 2) NOT NULL,
	"price_drop" numeric(10, 2) NOT NULL,
	"drop_percentage" numeric(5, 2) NOT NULL,
	"notification_sent" boolean DEFAULT false NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"color" text NOT NULL,
	"storage" text NOT NULL,
	"size_mm" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"brand" text NOT NULL,
	"storage" text NOT NULL,
	"color" text NOT NULL,
	"category" text,
	"capacity" text,
	"region" text,
	"date" text,
	"supplier_id" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"sku" text,
	"available" boolean DEFAULT true NOT NULL,
	"is_lowest_price" boolean DEFAULT false NOT NULL,
	"sheet_row_id" text,
	"product_timestamp" text,
	"ultima_atualizacao" timestamp DEFAULT now(),
	"search_vector" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_change_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_user_id" integer NOT NULL,
	"changed_by_user_id" integer NOT NULL,
	"previous_role" text NOT NULL,
	"new_role" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"ip_address" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"user_agent" text,
	"success" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sheets_webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sheet_id" text NOT NULL,
	"sheet_name" text NOT NULL,
	"range" text NOT NULL,
	"event_type" text NOT NULL,
	"row_number" integer,
	"column_number" integer,
	"old_value" text,
	"new_value" text,
	"user_email" text,
	"products_updated" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"previous_plan" text,
	"new_plan" text NOT NULL,
	"payment_status" text NOT NULL,
	"amount" numeric(10, 2),
	"payment_method" text,
	"transaction_id" text,
	"changed_by_user_id" integer,
	"reason" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_management" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"payment_date" timestamp,
	"renewal_date" timestamp,
	"days_until_renewal" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"nickname" text,
	"payment_method" text,
	"payment_amount" numeric(10, 2),
	"payment_status" text DEFAULT 'ativo' NOT NULL,
	"admin_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_management_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "supplier_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"supplier_name" text,
	"rating" integer NOT NULL,
	"comment" text,
	"is_approved" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"records_processed" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"target_audience" text[] DEFAULT '{"all"}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_permanent" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"action" text NOT NULL,
	"user_id" integer,
	"admin_user_id" integer,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"severity" text DEFAULT 'info' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"target_audience" text[] DEFAULT '{"all"}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"show_as_popup" boolean DEFAULT true NOT NULL,
	"show_as_banner" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"type" text DEFAULT 'string' NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by_user_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "user_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"details" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"item_id" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"note" text NOT NULL,
	"is_internal" boolean DEFAULT true NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notification_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profit_margins_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category_name" varchar(100) NOT NULL,
	"margin_percentage" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profit_margins_categories_user_id_category_name_unique" UNIQUE("user_id","category_name")
);
--> statement-breakpoint
CREATE TABLE "user_profit_margins_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"product_name" varchar(500),
	"margin_percentage" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profit_margins_products_user_id_product_id_unique" UNIQUE("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"session_token" text NOT NULL,
	"ip_address" text NOT NULL,
	"lastActivity" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_userId_unique" UNIQUE("userId"),
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"phone" text,
	"role" text DEFAULT 'user',
	"status" text DEFAULT 'pending_approval',
	"is_approved" boolean DEFAULT false,
	"is_admin" boolean DEFAULT false,
	"subscription_plan" text DEFAULT 'free',
	"is_subscription_active" boolean DEFAULT false,
	"approved_at" timestamp,
	"approved_by" integer,
	"tester_started_at" timestamp,
	"tester_expires_at" timestamp,
	"is_tester_expired" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	"ip_address" text,
	"user_agent" text,
	"session_token" text,
	"profile_image_url" text,
	"preferred_currency" text DEFAULT 'BRL',
	"notification_preferences" jsonb,
	"is_active" boolean DEFAULT true,
	"subscription_expires_at" timestamp,
	"trial_started_at" timestamp,
	"trial_expires_at" timestamp,
	"promotion_end_date" timestamp,
	"is_promotion_active" boolean DEFAULT false,
	"trial_used" boolean DEFAULT false,
	"login_attempts" integer DEFAULT 0,
	"last_login_attempt_at" timestamp,
	"account_locked" boolean DEFAULT false,
	"lock_until" timestamp,
	"email_verified" boolean DEFAULT false,
	"email_verification_token" text,
	"status_changed_at" timestamp,
	"status_changed_by" integer,
	"suspension_reason" text,
	"role_changed_at" timestamp,
	"role_changed_by" integer,
	"password_reset_token" text,
	"password_reset_expires" timestamp,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" text,
	"recovery_codes_used" integer DEFAULT 0,
	"last_password_changed_at" timestamp,
	"login_history" jsonb,
	"security_alerts" boolean DEFAULT true,
	"gdpr_consent_at" timestamp,
	"marketing_consent_at" timestamp,
	"data_retention_expires_at" timestamp,
	"api_key_id" text,
	"api_key_created_at" timestamp,
	"rate_limit_tier" text DEFAULT 'basic',
	"monthly_api_calls" integer DEFAULT 0,
	"max_monthly_api_calls" integer DEFAULT 1000,
	"current_api_call_count" integer DEFAULT 0,
	"api_calls_reset_at" timestamp,
	"webhook_url" text,
	"webhook_events" jsonb,
	"last_webhook_call_at" timestamp,
	"webhook_failure_count" integer DEFAULT 0,
	"custom_fields" jsonb,
	"integration_settings" jsonb,
	"terms_accepted_at" timestamp,
	"terms_version" text,
	"subscription_nickname" text,
	"manual_renewal_override" boolean DEFAULT false,
	"subscription_notes" text,
	"max_concurrent_ips" integer DEFAULT 5 NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_model" text NOT NULL,
	"product_brand" text,
	"product_color" text,
	"product_storage" text,
	"product_category" text,
	"supplier_name" text NOT NULL,
	"whatsapp_number" text NOT NULL,
	"product_price" numeric(10, 2),
	"ip_address" text,
	"user_agent" text,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "available_variants" ADD CONSTRAINT "available_variants_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_alert_views" ADD CONSTRAINT "emergency_alert_views_alert_id_emergency_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."emergency_alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_alert_views" ADD CONSTRAINT "emergency_alert_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_confirmations" ADD CONSTRAINT "event_confirmations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_confirmations" ADD CONSTRAINT "event_confirmations_confirmed_by_admin_users_id_fk" FOREIGN KEY ("confirmed_by_admin") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_alerts" ADD CONSTRAINT "feedback_alerts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_alert_id_feedback_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."feedback_alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest_list" ADD CONSTRAINT "interest_list_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_alert_id_price_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."price_alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_apple_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."apple_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_change_logs" ADD CONSTRAINT "role_change_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_change_logs" ADD CONSTRAINT "role_change_logs_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_management" ADD CONSTRAINT "subscription_management_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_management" ADD CONSTRAINT "subscription_management_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_ratings" ADD CONSTRAINT "supplier_ratings_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_ratings" ADD CONSTRAINT "supplier_ratings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_announcements" ADD CONSTRAINT "system_announcements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_notifications" ADD CONSTRAINT "system_notifications_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_reads" ADD CONSTRAINT "user_notification_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_reads" ADD CONSTRAINT "user_notification_reads_notification_id_system_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."system_notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profit_margins_categories" ADD CONSTRAINT "user_profit_margins_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profit_margins_products" ADD CONSTRAINT "user_profit_margins_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_clicks" ADD CONSTRAINT "whatsapp_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_supplier_ratings_supplier_id" ON "supplier_ratings" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_ratings_user_id" ON "supplier_ratings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_ratings_approval" ON "supplier_ratings" USING btree ("is_approved","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_supplier_ratings_unique_user_supplier" ON "supplier_ratings" USING btree ("user_id","supplier_id");