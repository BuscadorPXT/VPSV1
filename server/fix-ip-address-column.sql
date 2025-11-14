-- Fix for ip_address column missing error
-- This script adds the ip_address column if it doesn't exist

-- Check if ip_address column exists, if not add it
DO $$ 
BEGIN
    -- Try to add the column, ignore error if it already exists
    BEGIN
        ALTER TABLE users ADD COLUMN ip_address TEXT;
        RAISE NOTICE 'Column ip_address added successfully';
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column ip_address already exists';
    END;
    
    -- Optional: Set default values for existing records
    UPDATE users 
    SET ip_address = '0.0.0.0' 
    WHERE ip_address IS NULL;
    
END $$;