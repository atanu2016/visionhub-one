
#!/bin/bash

# VisionHub One Sentinel Update Script
# Version 1.2

# Exit on any error
set -e

# Print header
echo "============================================"
echo "  VisionHub One Sentinel Updater v1.2"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this script as root."
  echo "Use: sudo ./update.sh"
  exit 1
fi

INSTALL_DIR="/opt/visionhub-sentinel"
LOG_DIR="/var/log/visionhub"
UPDATE_LOG="$LOG_DIR/update.log"

# Function to log messages
log_message() {
  local msg="$1"
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo "[$timestamp] $msg"
  if [ -d "$LOG_DIR" ]; then
    echo "[$timestamp] $msg" >> "$UPDATE_LOG"
  fi
}

log_message "Updating VisionHub One Sentinel..."

# Check if installation directory exists
if [ ! -d "$INSTALL_DIR" ]; then
  log_message "Error: Installation directory not found at $INSTALL_DIR."
  log_message "Please run install.sh first."
  exit 1
fi

# Create log directory if it doesn't exist
if [ ! -d "$LOG_DIR" ]; then
  mkdir -p "$LOG_DIR"
  chmod -R 777 "$LOG_DIR"
fi

# Change to installation directory
cd $INSTALL_DIR || {
  log_message "Failed to change to installation directory"
  exit 1
}

# Check service status
SERVICE_ACTIVE=$(systemctl is-active visionhub.service)
log_message "Current service status: $SERVICE_ACTIVE"

# Stop the service if running
if [ "$SERVICE_ACTIVE" = "active" ]; then
  log_message "Stopping VisionHub One Sentinel service..."
  systemctl stop visionhub.service
fi

# Backup the current installation
BACKUP_DIR="$INSTALL_DIR/backup_$(date +%Y%m%d%H%M%S)"
log_message "Creating backup at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -r "$INSTALL_DIR"/* "$BACKUP_DIR/" || log_message "Warning: Some files could not be backed up"

# Pull latest changes
log_message "Pulling latest changes from repository..."
# Uncomment for actual git repository updates
# git pull

# Install dependencies
log_message "Installing dependencies..."
npm install --no-optional || {
  log_message "Failed to install dependencies. Trying with --force..."
  npm install --no-optional --force || {
    log_message "ERROR: Failed to install dependencies even with --force."
    log_message "Attempting to restore from backup and restart service..."
    if [ "$SERVICE_ACTIVE" = "active" ]; then
      systemctl start visionhub.service
    fi
    exit 1
  }
}

# Build frontend
log_message "Building frontend..."
npm run build || {
  log_message "Failed to build frontend. Attempting to restore from backup..."
  log_message "Restoring node_modules from backup..."
  rm -rf "$INSTALL_DIR/node_modules"
  cp -r "$BACKUP_DIR/node_modules" "$INSTALL_DIR/" || log_message "WARNING: Could not restore node_modules"
  
  log_message "Restoring dist from backup..."
  rm -rf "$INSTALL_DIR/dist"
  cp -r "$BACKUP_DIR/dist" "$INSTALL_DIR/" || log_message "WARNING: Could not restore dist"
  
  if [ "$SERVICE_ACTIVE" = "active" ]; then
    log_message "Restarting service..."
    systemctl start visionhub.service
  fi
  
  exit 1
}

# Start the service
log_message "Starting VisionHub One Sentinel service..."
systemctl start visionhub.service || {
  log_message "Failed to start service. Checking logs..."
  journalctl -u visionhub -n 50 >> "$UPDATE_LOG"
  
  log_message "Attempting to restore from backup..."
  if [ -d "$BACKUP_DIR/dist" ]; then
    log_message "Restoring frontend from backup..."
    rm -rf "$INSTALL_DIR/dist"
    cp -r "$BACKUP_DIR/dist" "$INSTALL_DIR/"
  fi
  
  log_message "Restarting service..."
  systemctl restart visionhub.service || {
    log_message "Service failed to start even after restore."
  }
  
  exit 1
}

# Check service status after starting
sleep 5
NEW_SERVICE_STATUS=$(systemctl is-active visionhub.service)
if [ "$NEW_SERVICE_STATUS" != "active" ]; then
  log_message "WARNING: Service not running properly after update."
  log_message "Service status: $NEW_SERVICE_STATUS"
  log_message "Attempting to restore from backup..."
  
  if [ -d "$BACKUP_DIR/dist" ]; then
    log_message "Restoring frontend from backup..."
    rm -rf "$INSTALL_DIR/dist"
    cp -r "$BACKUP_DIR/dist" "$INSTALL_DIR/"
  fi
  
  log_message "Restarting service..."
  systemctl restart visionhub.service
  
  sleep 5
  FINAL_STATUS=$(systemctl is-active visionhub.service)
  if [ "$FINAL_STATUS" != "active" ]; then
    log_message "ERROR: Failed to restore service. Manual intervention required."
    journalctl -u visionhub -n 50 >> "$UPDATE_LOG"
  else
    log_message "Successfully restored from backup."
  fi
fi

# Print completion message
echo ""
echo "============================================"
echo "  VisionHub One Sentinel updated successfully!"
echo "============================================"
echo ""
echo "* Service status: $(systemctl is-active visionhub.service)"
echo "* Access the web interface at: http://$(hostname -I | awk '{print $1}')"
echo "* Update log: $UPDATE_LOG"
echo "============================================"

# If service isn't running properly, provide troubleshooting info
if [ "$(systemctl is-active visionhub)" != "active" ]; then
  echo ""
  echo "WARNING: The VisionHub service is not running properly."
  echo "Here are the most recent logs:"
  echo ""
  journalctl -u visionhub -n 20
  echo ""
  echo "Try the following troubleshooting steps:"
  echo "1. Check logs: sudo journalctl -u visionhub -f"
  echo "2. Try restarting: sudo systemctl restart visionhub"
  echo "3. Run start script directly: sudo $INSTALL_DIR/scripts/start.sh"
  echo ""
fi
