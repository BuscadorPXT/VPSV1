
-- Fix admin schema - add missing columns
DO $$ 
BEGIN
    -- Add status_changed_at if missing
    BEGIN
        ALTER TABLE users ADD COLUMN status_changed_at TIMESTAMP;
        RAISE NOTICE 'Added: status_changed_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column status_changed_at already exists';
    END;
    
    -- Add status_changed_by if missing
    BEGIN
        ALTER TABLE users ADD COLUMN status_changed_by INTEGER;
        RAISE NOTICE 'Added: status_changed_by';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column status_changed_by already exists';
    END;
    
    -- Add role_changed_at if missing
    BEGIN
        ALTER TABLE users ADD COLUMN role_changed_at TIMESTAMP;
        RAISE NOTICE 'Added: role_changed_at';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column role_changed_at already exists';
    END;
    
    -- Add role_changed_by if missing
    BEGIN
        ALTER TABLE users ADD COLUMN role_changed_by INTEGER;
        RAISE NOTICE 'Added: role_changed_by';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column role_changed_by already exists';
    END;
    
    -- Add password_reset_token if missing
    BEGIN
        ALTER TABLE users ADD COLUMN password_reset_token TEXT;
        RAISE NOTICE 'Added: password_reset_token';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column password_reset_token already exists';
    END;
    
    -- Add password_reset_expires if missing
    BEGIN
        ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP;
        RAISE NOTICE 'Added: password_reset_expires';
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column password_reset_expires already exists';
    END;
    
    RAISE NOTICE 'Schema fix completed successfully!';
END $$;
