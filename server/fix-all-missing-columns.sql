
-- Fix all missing columns in users table
-- This script adds all missing columns identified by the check script

DO $$ 
BEGIN
    RAISE NOTICE 'Adding all missing columns to users table...';
    
    -- Add user_agent column (current error)
    BEGIN
        ALTER TABLE users ADD COLUMN user_agent TEXT;
        RAISE NOTICE 'Added: user_agent';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add session_token column
    BEGIN
        ALTER TABLE users ADD COLUMN session_token TEXT;
        RAISE NOTICE 'Added: session_token';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add profile_image_url column
    BEGIN
        ALTER TABLE users ADD COLUMN profile_image_url TEXT;
        RAISE NOTICE 'Added: profile_image_url';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add preferred_currency column
    BEGIN
        ALTER TABLE users ADD COLUMN preferred_currency TEXT DEFAULT 'BRL';
        RAISE NOTICE 'Added: preferred_currency';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add notification_preferences column
    BEGIN
        ALTER TABLE users ADD COLUMN notification_preferences JSONB;
        RAISE NOTICE 'Added: notification_preferences';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add is_active column
    BEGIN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added: is_active';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add subscription related columns
    BEGIN
        ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
        RAISE NOTICE 'Added: subscription_expires_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN trial_started_at TIMESTAMP;
        RAISE NOTICE 'Added: trial_started_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN trial_expires_at TIMESTAMP;
        RAISE NOTICE 'Added: trial_expires_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN promotion_end_date TIMESTAMP;
        RAISE NOTICE 'Added: promotion_end_date';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN is_promotion_active BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added: is_promotion_active';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN trial_used BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added: trial_used';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add security related columns
    BEGIN
        ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: login_attempts';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN last_login_attempt_at TIMESTAMP;
        RAISE NOTICE 'Added: last_login_attempt_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN account_locked BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added: account_locked';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN lock_until TIMESTAMP;
        RAISE NOTICE 'Added: lock_until';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added: email_verified';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN email_verification_token TEXT;
        RAISE NOTICE 'Added: email_verification_token';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN password_reset_token TEXT;
        RAISE NOTICE 'Added: password_reset_token';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMP;
        RAISE NOTICE 'Added: password_reset_expires_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add two factor authentication columns
    BEGIN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added: two_factor_enabled';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
        RAISE NOTICE 'Added: two_factor_secret';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN recovery_codes_used INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: recovery_codes_used';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN last_password_changed_at TIMESTAMP;
        RAISE NOTICE 'Added: last_password_changed_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add JSON columns for complex data
    BEGIN
        ALTER TABLE users ADD COLUMN login_history JSONB;
        RAISE NOTICE 'Added: login_history';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN security_alerts BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added: security_alerts';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add GDPR and consent columns
    BEGIN
        ALTER TABLE users ADD COLUMN gdpr_consent_at TIMESTAMP;
        RAISE NOTICE 'Added: gdpr_consent_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN marketing_consent_at TIMESTAMP;
        RAISE NOTICE 'Added: marketing_consent_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN data_retention_expires_at TIMESTAMP;
        RAISE NOTICE 'Added: data_retention_expires_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add API related columns
    BEGIN
        ALTER TABLE users ADD COLUMN api_key_id TEXT;
        RAISE NOTICE 'Added: api_key_id';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN api_key_created_at TIMESTAMP;
        RAISE NOTICE 'Added: api_key_created_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN rate_limit_tier TEXT DEFAULT 'basic';
        RAISE NOTICE 'Added: rate_limit_tier';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN monthly_api_calls INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: monthly_api_calls';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN max_monthly_api_calls INTEGER DEFAULT 1000;
        RAISE NOTICE 'Added: max_monthly_api_calls';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN current_api_call_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: current_api_call_count';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN api_calls_reset_at TIMESTAMP;
        RAISE NOTICE 'Added: api_calls_reset_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add webhook columns
    BEGIN
        ALTER TABLE users ADD COLUMN webhook_url TEXT;
        RAISE NOTICE 'Added: webhook_url';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN webhook_events JSONB;
        RAISE NOTICE 'Added: webhook_events';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN last_webhook_call_at TIMESTAMP;
        RAISE NOTICE 'Added: last_webhook_call_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN webhook_failure_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: webhook_failure_count';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add customization columns
    BEGIN
        ALTER TABLE users ADD COLUMN custom_fields JSONB;
        RAISE NOTICE 'Added: custom_fields';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN integration_settings JSONB;
        RAISE NOTICE 'Added: integration_settings';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Add terms columns
    BEGIN
        ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP;
        RAISE NOTICE 'Added: terms_accepted_at';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN terms_version TEXT;
        RAISE NOTICE 'Added: terms_version';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Update existing records with default values where needed
    UPDATE users 
    SET 
        preferred_currency = COALESCE(preferred_currency, 'BRL'),
        is_active = COALESCE(is_active, true),
        is_promotion_active = COALESCE(is_promotion_active, false),
        trial_used = COALESCE(trial_used, false),
        login_attempts = COALESCE(login_attempts, 0),
        account_locked = COALESCE(account_locked, false),
        email_verified = COALESCE(email_verified, false),
        two_factor_enabled = COALESCE(two_factor_enabled, false),
        recovery_codes_used = COALESCE(recovery_codes_used, 0),
        security_alerts = COALESCE(security_alerts, true),
        rate_limit_tier = COALESCE(rate_limit_tier, 'basic'),
        monthly_api_calls = COALESCE(monthly_api_calls, 0),
        max_monthly_api_calls = COALESCE(max_monthly_api_calls, 1000),
        current_api_call_count = COALESCE(current_api_call_count, 0),
        webhook_failure_count = COALESCE(webhook_failure_count, 0)
    WHERE id IS NOT NULL;
    
    RAISE NOTICE 'All missing columns have been added successfully!';
    RAISE NOTICE 'Updated existing records with default values.';
END $$;
