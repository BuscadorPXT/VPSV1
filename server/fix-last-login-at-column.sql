-- Fix for last_login_at column missing error
-- This script adds the last_login_at column if it doesn't exist

-- Check if last_login_at column exists, if not add it
DO $$ 
BEGIN
    -- Try to add the column, ignore error if it already exists
    BEGIN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
        RAISE NOTICE 'Column last_login_at added successfully';
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column last_login_at already exists';
    END;
    
    -- Update existing records to set last_login_at to created_at for users who never logged in
    UPDATE users 
    SET last_login_at = created_at 
    WHERE last_login_at IS NULL;
    
END $$;