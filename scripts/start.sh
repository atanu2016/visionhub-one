
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

# Check if the node_modules directory exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  # Use --force and --no-optional to avoid the Rollup optional dependency issue
  npm install --no-optional --force || { echo "Failed to install dependencies"; exit 1; }
fi

# Check if the dist directory exists
if [ ! -d "dist" ]; then
  echo "Building frontend..."
  # Set environment variable to skip optional Rollup dependencies
  export ROLLUP_SKIP_LOAD_NATIVE_PLUGIN=true
  npm run build || { 
    echo "Failed to build frontend with npm run build, trying with direct Vite command..."
    ./node_modules/.bin/vite build || {
      echo "Failed to build frontend. Check logs at $LOG_DIR/startup.log"
      exit 1
    }
  }
fi

# Create a temporary success file to track successful starts
touch "$LOG_DIR/startup_in_progress"

# Start the server with better error handling
echo "Starting VisionHub One Sentinel backend server..."
node backend/index.js 2>&1 | tee -a "$LOG_DIR/startup.log" || {
  echo "Failed to start server. Check logs at $LOG_DIR/startup.log"
  exit 1
}

# If execution gets to this point, remove the in-progress file
rm -f "$LOG_DIR/startup_in_progress"
touch "$LOG_DIR/startup_success"
