
#!/bin/bash

# VisionHub One Sentinel Startup Script

# Set environment variables
export NODE_ENV=production
export PORT=${PORT:-3000}
export DB_PATH=${DB_PATH:-/var/visionhub/db/visionhub.db}
export STORAGE_PATH=${STORAGE_PATH:-/var/visionhub/recordings}

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root directory
cd $PROJECT_ROOT

# Check if the node_modules directory exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the server
echo "Starting VisionHub One Sentinel..."
node server.js
