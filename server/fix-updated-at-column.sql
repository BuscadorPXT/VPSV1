
-- Fix for updated_at column missing error
-- This script adds the updated_at column if it doesn't exist

-- Check if updated_at column exists, if not add it
DO $$ 
BEGIN
    -- Try to add the column, ignore error if it already exists
    BEGIN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Column updated_at added successfully';
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column updated_at already exists';
    END;
    
    -- Update existing records that have NULL updated_at
    UPDATE users 
    SET updated_at = created_at 
    WHERE updated_at IS NULL;
    
END $$;
