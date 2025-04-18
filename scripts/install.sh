
#!/bin/bash

# VisionHub One Sentinel Install Script

# Exit on any error
set -e

# Print header
echo "============================================"
echo "  VisionHub One Sentinel Installer"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this script as root."
  echo "Use: sudo ./install.sh"
  exit 1
fi

# Default installation directory
INSTALL_DIR="/opt/visionhub/visionhub-one-sentinel"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -d|--directory)
      INSTALL_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "Installing VisionHub One Sentinel to $INSTALL_DIR"

# Check for required dependencies
echo "Checking system requirements..."

# Check ffmpeg
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Installing ffmpeg..."
  apt-get update && apt-get install -y ffmpeg
fi

# Check node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
fi

# Check npm
if ! command -v npm >/dev/null 2>&1; then
  echo "Installing npm..."
  apt-get install -y npm
fi

# Check cifs-utils (for NAS storage)
if ! command -v mount.cifs >/dev/null 2>&1; then
  echo "Installing cifs-utils for NAS support..."
  apt-get install -y cifs-utils
fi

# Create installation directory
echo "Creating installation directory..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Clone repository or copy files
echo "Copying application files..."
# Note: In a real installation this would clone from a git repository
# git clone https://github.com/example/visionhub-one-sentinel.git .

# Create data directories
echo "Creating data directories..."
mkdir -p $INSTALL_DIR/db
mkdir -p /var/visionhub/recordings
mkdir -p /mnt/visionhub

# Set permissions
echo "Setting permissions..."
chown -R $SUDO_USER:$SUDO_USER $INSTALL_DIR
chmod -R 755 $INSTALL_DIR
chmod -R 755 /var/visionhub
chmod -R 777 /mnt/visionhub

# Install dependencies
echo "Installing dependencies..."
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Create systemd service
echo "Creating service..."
cat > /etc/systemd/system/visionhub.service << 'EOL'
[Unit]
Description=VisionHub One Sentinel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=INSTALL_DIR
ExecStart=/usr/bin/node INSTALL_DIR/backend/index.js
Restart=on-failure
Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Replace placeholder with actual install directory
sed -i "s|INSTALL_DIR|$INSTALL_DIR|g" /etc/systemd/system/visionhub.service

# Reload systemd and start service
echo "Starting service..."
systemctl daemon-reload
systemctl enable visionhub
systemctl start visionhub

# Print completion message
echo ""
echo "============================================"
echo "  VisionHub One Sentinel installation complete!"
echo "============================================"
echo ""
echo "* Service status: $(systemctl is-active visionhub.service)"
echo "* Access the web interface at: http://$(hostname -I | awk '{print $1}'):3000"
echo "* Logs can be viewed with: journalctl -u visionhub.service -f"
echo "============================================"
echo ""
echo "Thank you for installing VisionHub One Sentinel!"
echo ""
