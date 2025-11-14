
-- Add new fields to users table for enhanced admin management
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_changed_by INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_changed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_changed_by INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_status_changed_by 
  FOREIGN KEY (status_changed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT fk_users_role_changed_by 
  FOREIGN KEY (role_changed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create admin impersonation logs table
CREATE TABLE IF NOT EXISTS admin_impersonation_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  target_user_id INTEGER NOT NULL,
  impersonation_token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create user activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_status_changed_at ON users(status_changed_at);
CREATE INDEX IF NOT EXISTS idx_users_role_changed_at ON users(role_changed_at);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_logs_admin_id ON admin_impersonation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_logs_target_user_id ON admin_impersonation_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_logs_token ON admin_impersonation_logs(impersonation_token);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- Add comments to new columns
COMMENT ON COLUMN users.account_status IS 'Status da conta do usuário (active, suspended, disabled)';
COMMENT ON COLUMN users.status_changed_at IS 'Data da última alteração de status';
COMMENT ON COLUMN users.status_changed_by IS 'ID do admin que alterou o status';
COMMENT ON COLUMN users.suspension_reason IS 'Motivo da suspensão da conta';
COMMENT ON COLUMN users.role_changed_at IS 'Data da última alteração de função';
COMMENT ON COLUMN users.role_changed_by IS 'ID do admin que alterou a função';
COMMENT ON COLUMN users.password_reset_token IS 'Token para redefinição de senha';
COMMENT ON COLUMN users.password_reset_expires IS 'Data de expiração do token de reset';

-- Add table comments
COMMENT ON TABLE admin_impersonation_logs IS 'Log de impersonações realizadas por administradores';
COMMENT ON TABLE user_activity_logs IS 'Log de atividades dos usuários no sistema';
