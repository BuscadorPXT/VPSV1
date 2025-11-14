
-- Migration to add API key fields to users table
-- Run this to fix the "column api_key does not exist" error

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS api_key TEXT,
ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMP;

-- Create index for better performance on API key lookups
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key) WHERE api_key IS NOT NULL;

-- Log the migration
INSERT INTO system_logs (type, action, details, severity, created_at)
VALUES ('migration', 'add_api_key_fields', 'Added api_key and api_key_created_at columns to users table', 'info', NOW());
