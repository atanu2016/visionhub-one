
#!/bin/bash

# VisionHub One Sentinel Startup Script

# Exit on error
set -e

echo "========================================"
echo "   VisionHub One Sentinel Startup"
echo "========================================"

# Set environment variables
export NODE_ENV=production
export PORT=${PORT:-3000}
export DB_PATH=${DB_PATH:-/var/visionhub/db/visionhub.db}
export STORAGE_PATH=${STORAGE_PATH:-/var/visionhub/recordings}
export JWT_SECRET=${JWT_SECRET:-"visionhub-sentinel-secret-key"}

# CRITICAL: Set Rollup environment variables to avoid native module issues
export ROLLUP_SKIP_LOAD_NATIVE_PLUGIN=true
# This tells Node.js to prefer pure JS implementations
export NODE_OPTIONS="--no-node-snapshot --no-experimental-fetch"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Starting VisionHub One Sentinel..."
echo "Project root: $PROJECT_ROOT"
echo "Database path: $DB_PATH"

# Check if database directory exists, create if not
DB_DIR=$(dirname "$DB_PATH")
if [ ! -d "$DB_DIR" ]; then
  echo "Creating database directory: $DB_DIR"
  mkdir -p "$DB_DIR"
  chmod -R 777 "$DB_DIR"
fi

# Check if storage directory exists, create if not
if [ ! -d "$STORAGE_PATH" ]; then
  echo "Creating storage directory: $STORAGE_PATH"
  mkdir -p "$STORAGE_PATH"
  chmod -R 777 "$STORAGE_PATH"
fi

# Create logs directory
LOG_DIR="/var/log/visionhub"
if [ ! -d "$LOG_DIR" ]; then
  echo "Creating log directory: $LOG_DIR"
  mkdir -p "$LOG_DIR" 
  chmod -R 777 "$LOG_DIR"
fi

# Create SSL directory if it doesn't exist
SSL_DIR="$PROJECT_ROOT/ssl"
if [ ! -d "$SSL_DIR" ]; then
  echo "Creating SSL directory: $SSL_DIR"
  mkdir -p "$SSL_DIR"
  chmod -R 755 "$SSL_DIR"
fi

# Change to project root directory
cd $PROJECT_ROOT || { echo "Failed to change to project directory"; exit 1; }

# Check if the dist directory exists - if not, try to use pre-built dist from backup
if [ ! -d "dist" ] && [ -d "backup_dist" ]; then
  echo "Using pre-built frontend from backup_dist..."
  cp -r backup_dist dist
fi

# Check if the dist directory exists now
if [ ! -d "dist" ]; then
  echo "Frontend not built yet. Starting backend without frontend."
  echo "IMPORTANT: You will need to build the frontend separately."
fi

# Create a temporary success file to track successful starts
touch "$LOG_DIR/startup_in_progress"

# Start the server with better error handling
echo "Starting VisionHub One Sentinel backend server..."

# More robust server start
node backend/index.js 2>&1 | tee -a "$LOG_DIR/startup.log" || {
  echo "Failed to start server. Check logs at $LOG_DIR/startup.log"
  echo "Checking for known issues..."
  
  # Check if the backend/index.js file exists
  if [ ! -f "backend/index.js" ]; then
    echo "ERROR: backend/index.js file not found!"
  fi
  
  # Check database file
  if [ ! -f "$DB_PATH" ]; then
    echo "WARNING: Database file not found at $DB_PATH. Will be created on first successful start."
  fi
  
  # Print disk space
  echo "Checking disk space:"
  df -h | grep -E "(Filesystem|/$|$STORAGE_PATH)"
  
  exit 1
}

# If execution gets to this point, remove the in-progress file
rm -f "$LOG_DIR/startup_in_progress"
touch "$LOG_DIR/startup_success"
