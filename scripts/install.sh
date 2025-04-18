
#!/bin/bash

# VisionHub One Sentinel Installation Script
# For Ubuntu Server 22.04 LTS

# Exit on any error
set -e

# Print header
echo "============================================"
echo "  VisionHub One Sentinel Installer"
echo "  Version 1.0.0"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this script as root."
  echo "Use: sudo ./install.sh"
  exit 1
fi

# Create installation directory
INSTALL_DIR="/opt/visionhub"
echo "Creating installation directory at $INSTALL_DIR..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Update system and install dependencies
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

echo "Installing required dependencies..."
apt-get install -y curl wget gnupg2 ffmpeg sqlite3 build-essential git cifs-utils

# Install Node.js 18.x
echo "Installing Node.js..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
fi

# Verify Node.js and npm installation
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo "Node.js version: $NODE_VERSION"
echo "npm version: $NPM_VERSION"

# Create directories for recordings
echo "Creating directories for recordings and logs..."
mkdir -p /var/visionhub/recordings
mkdir -p /var/visionhub/logs
mkdir -p /var/visionhub/db
mkdir -p /mnt/visionhub
chmod -R 755 /var/visionhub
chmod -R 755 /mnt/visionhub

# Clone the repository
echo "Cloning VisionHub One Sentinel repository..."
if [ -d "$INSTALL_DIR/visionhub-one-sentinel" ]; then
  echo "Repository directory already exists. Updating..."
  cd $INSTALL_DIR/visionhub-one-sentinel
  git pull
else
  git clone https://github.com/yourusername/visionhub-one-sentinel.git $INSTALL_DIR/visionhub-one-sentinel
  cd $INSTALL_DIR/visionhub-one-sentinel
fi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Create SQLite database
echo "Initializing SQLite database..."
cat > $INSTALL_DIR/visionhub-one-sentinel/init-db.sql << 'EOL'
-- Create Cameras table
CREATE TABLE IF NOT EXISTS cameras (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  onvif_port INTEGER NOT NULL,
  username TEXT,
  password TEXT,
  status TEXT NOT NULL,
  motion_detection BOOLEAN NOT NULL,
  motion_sensitivity INTEGER NOT NULL,
  location TEXT,
  manufacturer TEXT,
  model TEXT,
  last_updated TEXT NOT NULL,
  is_recording BOOLEAN NOT NULL DEFAULT 0
);

-- Create Recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  camera_id TEXT NOT NULL,
  camera_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration INTEGER,
  trigger_type TEXT NOT NULL,
  file_size INTEGER,
  file_path TEXT NOT NULL,
  thumbnail TEXT,
  FOREIGN KEY (camera_id) REFERENCES cameras (id)
);

-- Create Events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  camera_id TEXT,
  severity TEXT NOT NULL,
  FOREIGN KEY (camera_id) REFERENCES cameras (id)
);

-- Create Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  storage_location TEXT NOT NULL,
  network_subnet TEXT NOT NULL,
  recording_format TEXT NOT NULL,
  recording_quality TEXT NOT NULL,
  motion_detection_enabled BOOLEAN NOT NULL,
  alert_email TEXT,
  alert_webhook_url TEXT,
  retention_days INTEGER NOT NULL,
  storage_type TEXT DEFAULT 'local',
  nas_path TEXT,
  nas_username TEXT,
  nas_password TEXT,
  nas_mounted BOOLEAN DEFAULT 0
);

-- Insert default settings
INSERT OR IGNORE INTO settings (id, storage_location, network_subnet, recording_format, recording_quality, motion_detection_enabled, retention_days)
VALUES (1, '/var/visionhub/recordings/', '192.168.1.0/24', 'mp4', 'medium', 1, 30);
EOL

sqlite3 /var/visionhub/db/visionhub.db < $INSTALL_DIR/visionhub-one-sentinel/init-db.sql

# Set up systemd service
echo "Setting up systemd service..."
cat > /etc/systemd/system/visionhub.service << EOL
[Unit]
Description=VisionHub One Sentinel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/visionhub-one-sentinel
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=visionhub
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DB_PATH=/var/visionhub/db/visionhub.db
Environment=STORAGE_PATH=/var/visionhub/recordings

[Install]
WantedBy=multi-user.target
EOL

# Enable and start the service
echo "Enabling and starting VisionHub One Sentinel service..."
systemctl daemon-reload
systemctl enable visionhub.service
systemctl start visionhub.service

# Create update script
echo "Creating update script..."
cat > $INSTALL_DIR/update.sh << 'EOL'
#!/bin/bash
set -e

INSTALL_DIR="/opt/visionhub/visionhub-one-sentinel"
echo "Updating VisionHub One Sentinel..."
cd $INSTALL_DIR

# Pull latest changes
git pull

# Install dependencies
npm install

# Build frontend
npm run build

# Restart service
systemctl restart visionhub.service
echo "Update completed successfully!"
EOL

chmod +x $INSTALL_DIR/update.sh

# Print completion message
echo ""
echo "============================================"
echo "  VisionHub One Sentinel installed successfully!"
echo "============================================"
echo ""
echo "* Service status: $(systemctl is-active visionhub.service)"
echo "* Access the web interface at: http://$(hostname -I | awk '{print $1}'):3000"
echo "* Recordings directory: /var/visionhub/recordings"
echo "* NAS mount point: /mnt/visionhub"
echo "* Database location: /var/visionhub/db/visionhub.db"
echo "* To update: sudo $INSTALL_DIR/update.sh"
echo ""
echo "For more information, refer to the documentation."
echo "============================================"
