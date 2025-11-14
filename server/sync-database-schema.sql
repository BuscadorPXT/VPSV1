
-- Sync database schema with shared/schema.ts
-- This migration adds all missing columns to match the current schema

DO $$ 
BEGIN
    RAISE NOTICE 'Starting database schema synchronization...';
    
    -- Add accountStatus column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN account_status VARCHAR(50) DEFAULT 'active';
        RAISE NOTICE 'Added: account_status';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column account_status already exists';
    END;
    
    -- Add statusChangedAt column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN status_changed_at TIMESTAMP;
        RAISE NOTICE 'Added: status_changed_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column status_changed_at already exists';
    END;
    
    -- Add statusChangedBy column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN status_changed_by INTEGER;
        RAISE NOTICE 'Added: status_changed_by';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column status_changed_by already exists';
    END;
    
    -- Add suspensionReason column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN suspension_reason TEXT;
        RAISE NOTICE 'Added: suspension_reason';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column suspension_reason already exists';
    END;
    
    -- Add roleChangedAt column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN role_changed_at TIMESTAMP;
        RAISE NOTICE 'Added: role_changed_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column role_changed_at already exists';
    END;
    
    -- Add roleChangedBy column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN role_changed_by INTEGER;
        RAISE NOTICE 'Added: role_changed_by';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column role_changed_by already exists';
    END;
    
    -- Add passwordResetToken column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN password_reset_token TEXT;
        RAISE NOTICE 'Added: password_reset_token';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column password_reset_token already exists';
    END;
    
    -- Add passwordResetExpires column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP;
        RAISE NOTICE 'Added: password_reset_expires';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column password_reset_expires already exists';
    END;
    
    -- Add twoFactorEnabled column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added: two_factor_enabled';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column two_factor_enabled already exists';
    END;
    
    -- Add twoFactorSecret column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
        RAISE NOTICE 'Added: two_factor_secret';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column two_factor_secret already exists';
    END;
    
    -- Add recoveryCodesUsed column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN recovery_codes_used INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: recovery_codes_used';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column recovery_codes_used already exists';
    END;
    
    -- Add lastPasswordChangedAt column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN last_password_changed_at TIMESTAMP;
        RAISE NOTICE 'Added: last_password_changed_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column last_password_changed_at already exists';
    END;
    
    -- Add loginHistory column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN login_history JSONB;
        RAISE NOTICE 'Added: login_history';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column login_history already exists';
    END;
    
    -- Add securityAlerts column if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN security_alerts BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added: security_alerts';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column security_alerts already exists';
    END;
    
    -- Add GDPR consent columns if they don't exist
    BEGIN
        ALTER TABLE users ADD COLUMN gdpr_consent_at TIMESTAMP;
        RAISE NOTICE 'Added: gdpr_consent_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column gdpr_consent_at already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN marketing_consent_at TIMESTAMP;
        RAISE NOTICE 'Added: marketing_consent_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column marketing_consent_at already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN data_retention_expires_at TIMESTAMP;
        RAISE NOTICE 'Added: data_retention_expires_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column data_retention_expires_at already exists';
    END;
    
    -- Add API key columns if they don't exist
    BEGIN
        ALTER TABLE users ADD COLUMN api_key_id TEXT;
        RAISE NOTICE 'Added: api_key_id';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column api_key_id already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN api_key_created_at TIMESTAMP;
        RAISE NOTICE 'Added: api_key_created_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column api_key_created_at already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN rate_limit_tier TEXT DEFAULT 'basic';
        RAISE NOTICE 'Added: rate_limit_tier';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column rate_limit_tier already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN monthly_api_calls INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: monthly_api_calls';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column monthly_api_calls already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN max_monthly_api_calls INTEGER DEFAULT 1000;
        RAISE NOTICE 'Added: max_monthly_api_calls';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column max_monthly_api_calls already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN current_api_call_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: current_api_call_count';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column current_api_call_count already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN api_calls_reset_at TIMESTAMP;
        RAISE NOTICE 'Added: api_calls_reset_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column api_calls_reset_at already exists';
    END;
    
    -- Add webhook columns if they don't exist
    BEGIN
        ALTER TABLE users ADD COLUMN webhook_url TEXT;
        RAISE NOTICE 'Added: webhook_url';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column webhook_url already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN webhook_events JSONB;
        RAISE NOTICE 'Added: webhook_events';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column webhook_events already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN last_webhook_call_at TIMESTAMP;
        RAISE NOTICE 'Added: last_webhook_call_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column last_webhook_call_at already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN webhook_failure_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: webhook_failure_count';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column webhook_failure_count already exists';
    END;
    
    -- Add customization columns if they don't exist
    BEGIN
        ALTER TABLE users ADD COLUMN custom_fields JSONB;
        RAISE NOTICE 'Added: custom_fields';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column custom_fields already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN integration_settings JSONB;
        RAISE NOTICE 'Added: integration_settings';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column integration_settings already exists';
    END;
    
    -- Add terms columns if they don't exist
    BEGIN
        ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP;
        RAISE NOTICE 'Added: terms_accepted_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column terms_accepted_at already exists';
    END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN terms_version TEXT;
        RAISE NOTICE 'Added: terms_version';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column terms_version already exists';
    END;
    
    -- Update existing records with default values where needed
    UPDATE users 
    SET 
        account_status = COALESCE(account_status, 'active'),
        two_factor_enabled = COALESCE(two_factor_enabled, false),
        recovery_codes_used = COALESCE(recovery_codes_used, 0),
        security_alerts = COALESCE(security_alerts, true),
        rate_limit_tier = COALESCE(rate_limit_tier, 'basic'),
        monthly_api_calls = COALESCE(monthly_api_calls, 0),
        max_monthly_api_calls = COALESCE(max_monthly_api_calls, 1000),
        current_api_call_count = COALESCE(current_api_call_count, 0),
        webhook_failure_count = COALESCE(webhook_failure_count, 0)
    WHERE 
        account_status IS NULL OR
        two_factor_enabled IS NULL OR
        recovery_codes_used IS NULL OR
        security_alerts IS NULL OR
        rate_limit_tier IS NULL OR
        monthly_api_calls IS NULL OR
        max_monthly_api_calls IS NULL OR
        current_api_call_count IS NULL OR
        webhook_failure_count IS NULL;
    
    RAISE NOTICE 'Database schema synchronization completed successfully!';
    
END $$;
