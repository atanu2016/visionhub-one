
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  last_login TEXT
);

-- Create initial admin user if it doesn't exist
INSERT OR IGNORE INTO users (id, username, password, email, role, created_at)
VALUES ('admin', 'admin', '$2b$10$8D4t0G7jprSXza7UpVLZPeY0/cT/X/kPrJ4itmr/Mm1QkWUkxqGv6', 'admin@visionhub.local', 'admin', datetime('now'));
