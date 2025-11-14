
-- Migration to add expiresAt field to user_sessions table

ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Update existing sessions to have a reasonable expiration (24 hours from creation)
UPDATE user_sessions 
SET expires_at = created_at + INTERVAL '24 hours' 
WHERE expires_at IS NULL;

-- Log the migration
INSERT INTO system_logs (type, action, details, severity, created_at)
VALUES ('migration', 'add_session_expires', 'Added expires_at column to user_sessions table', 'info', NOW());
