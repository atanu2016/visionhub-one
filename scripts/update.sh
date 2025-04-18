
#!/bin/bash

# VisionHub One Sentinel Update Script

# Exit on any error
set -e

# Print header
echo "============================================"
echo "  VisionHub One Sentinel Updater"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this script as root."
  echo "Use: sudo ./update.sh"
  exit 1
fi

INSTALL_DIR="/opt/visionhub/visionhub-one-sentinel"
echo "Updating VisionHub One Sentinel..."

# Check if installation directory exists
if [ ! -d "$INSTALL_DIR" ]; then
  echo "Error: Installation directory not found at $INSTALL_DIR."
  echo "Please run install.sh first."
  exit 1
fi

# Change to installation directory
cd $INSTALL_DIR

# Check service status
SERVICE_ACTIVE=$(systemctl is-active visionhub.service)
echo "Current service status: $SERVICE_ACTIVE"

# Stop the service if running
if [ "$SERVICE_ACTIVE" = "active" ]; then
  echo "Stopping VisionHub One Sentinel service..."
  systemctl stop visionhub.service
fi

# Pull latest changes
echo "Pulling latest changes from repository..."
git pull

# Install dependencies
echo "Installing dependencies..."
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Start the service
echo "Starting VisionHub One Sentinel service..."
systemctl start visionhub.service

# Print completion message
echo ""
echo "============================================"
echo "  VisionHub One Sentinel updated successfully!"
echo "============================================"
echo ""
echo "* Service status: $(systemctl is-active visionhub.service)"
echo "* Access the web interface at: http://$(hostname -I | awk '{print $1}'):3000"
echo "============================================"
