
-- Create users table with proper constraints
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  last_login TEXT,
  last_login_ip TEXT,
  login_attempts INTEGER DEFAULT 0,
  lockout_until TEXT
);

-- Create initial admin user if it doesn't exist with a compliant password
-- Password: Admin123!
INSERT OR IGNORE INTO users (id, username, password, email, role, created_at, updated_at)
VALUES ('admin', 'admin', '$2b$10$mD0vNALVAXY3lI5.zYtJTeQwzrOSp7Jh4lfGI0f80SSrz0N2cRiqK', 'admin@visionhub.local', 'admin', datetime('now'), datetime('now'));

-- Make sure we have a settings table for system configuration
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  ssl_enabled INTEGER DEFAULT 0,
  ssl_cert_path TEXT,
  ssl_key_path TEXT,
  storage_location TEXT DEFAULT '/var/visionhub/recordings',
  backup_enabled INTEGER DEFAULT 0,
  backup_path TEXT,
  backup_schedule TEXT DEFAULT 'daily',
  alert_email TEXT,
  alert_on_motion INTEGER DEFAULT 0,
  alert_on_offline INTEGER DEFAULT 0
);

-- Initial settings values if needed
INSERT OR IGNORE INTO settings (id, ssl_enabled, storage_location)
VALUES ('1', 0, '/var/visionhub/recordings');

-- Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'info',
  camera_id TEXT,
  acknowledged INTEGER DEFAULT 0
);
