
CREATE TABLE IF NOT EXISTS cameras (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  onvif_port INTEGER,
  username TEXT,
  password TEXT,
  status TEXT DEFAULT 'idle',
  motion_detection INTEGER DEFAULT 0,
  motion_sensitivity INTEGER DEFAULT 50,
  location TEXT,
  manufacturer TEXT,
  model TEXT,
  last_updated TEXT,
  is_recording INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  camera_id TEXT NOT NULL,
  camera_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration INTEGER,
  trigger_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail TEXT,
  file_size INTEGER,
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  camera_id TEXT,
  severity TEXT DEFAULT 'info',
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT '1',
  storage_location TEXT DEFAULT '/var/visionhub/recordings/',
  network_subnet TEXT DEFAULT '192.168.1.0/24',
  recording_format TEXT DEFAULT 'mp4',
  recording_quality TEXT DEFAULT 'medium',
  motion_detection_enabled INTEGER DEFAULT 1,
  alert_email TEXT,
  alert_webhook_url TEXT,
  retention_days INTEGER DEFAULT 30,
  storage_type TEXT DEFAULT 'local',
  nas_path TEXT,
  nas_username TEXT,
  nas_password TEXT,
  nas_mounted INTEGER DEFAULT 0,
  ssl_enabled INTEGER DEFAULT 0,
  ssl_cert_path TEXT,
  ssl_key_path TEXT
);
