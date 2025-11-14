-- Check for missing columns in users table
-- This script will show which columns from the schema are missing

DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[
        'user_agent',
        'session_token', 
        'profile_image_url',
        'preferred_currency',
        'notification_preferences',
        'is_active',
        'subscription_expires_at',
        'trial_started_at',
        'trial_expires_at',
        'promotion_end_date',
        'is_promotion_active',
        'trial_used',
        'login_attempts',
        'last_login_attempt_at',
        'account_locked',
        'lock_until',
        'email_verified',
        'email_verification_token',
        'password_reset_token',
        'password_reset_expires_at',
        'two_factor_enabled',
        'two_factor_secret',
        'recovery_codes_used',
        'last_password_changed_at',
        'login_history',
        'security_alerts',
        'gdpr_consent_at',
        'marketing_consent_at',
        'data_retention_expires_at',
        'api_key_id',
        'api_key_created_at',
        'rate_limit_tier',
        'monthly_api_calls',
        'max_monthly_api_calls',
        'current_api_call_count',
        'api_calls_reset_at',
        'webhook_url',
        'webhook_events',
        'last_webhook_call_at',
        'webhook_failure_count',
        'custom_fields',
        'integration_settings',
        'terms_accepted_at',
        'terms_version'
    ];
    col TEXT;
    column_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Checking for missing columns in users table...';
    
    FOREACH col IN ARRAY missing_columns
    LOOP
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = col
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            RAISE NOTICE 'Missing column: %', col;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Column check completed.';
END $$;