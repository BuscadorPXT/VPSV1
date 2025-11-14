
-- Check if details column exists and add it if missing
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'admin_action_logs' 
        AND column_name = 'details'
    ) THEN
        -- Add the details column
        ALTER TABLE admin_action_logs 
        ADD COLUMN details TEXT;
        
        -- Update existing records to copy reason to details
        UPDATE admin_action_logs 
        SET details = reason 
        WHERE reason IS NOT NULL AND details IS NULL;
        
        RAISE NOTICE 'Added details column to admin_action_logs table';
    ELSE
        RAISE NOTICE 'Details column already exists in admin_action_logs table';
    END IF;
END $$;
