
#!/bin/bash

# VisionHub One Sentinel Startup Script

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
fi

# Check if storage directory exists, create if not
if [ ! -d "$STORAGE_PATH" ]; then
  echo "Creating storage directory: $STORAGE_PATH"
  mkdir -p "$STORAGE_PATH"
fi

# Change to project root directory
cd $PROJECT_ROOT || { echo "Failed to change to project directory"; exit 1; }

# Check if the node_modules directory exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install || { echo "Failed to install dependencies"; exit 1; }
fi

# Start the server with better error handling
echo "Starting VisionHub One Sentinel backend server..."
node backend/index.js 2>&1 | tee -a /var/log/visionhub/startup.log || {
  echo "Failed to start server. Check logs at /var/log/visionhub/startup.log"
  exit 1
}
