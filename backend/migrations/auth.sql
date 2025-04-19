
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  last_login TEXT,
  last_login_ip TEXT,
  login_attempts INTEGER DEFAULT 0,
  lockout_until TEXT
);

-- Create initial admin user if it doesn't exist with a compliant password
-- Password: Admin123!
INSERT OR IGNORE INTO users (id, username, password, email, role, created_at)
VALUES ('admin', 'admin', '$2b$10$mD0vNALVAXY3lI5.zYtJTeQwzrOSp7Jh4lfGI0f80SSrz0N2cRiqK', 'admin@visionhub.local', 'admin', datetime('now'));
