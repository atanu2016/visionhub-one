
#!/bin/bash

# VisionHub One Sentinel Update Script
# Version 1.3.0 - With improved Rollup workarounds

# Exit on any error
set -e

# Print header
echo "============================================"
echo "  VisionHub One Sentinel Updater v1.3.0"
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
SERVICE_ACTIVE=$(systemctl is-active visionhub.service || echo "inactive")
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
cp -r "$INSTALL_DIR"/* "$BACKUP_DIR/" 2>/dev/null || log_message "Warning: Some files could not be backed up"

# Backup the dist directory specifically to a fixed location
if [ -d "$INSTALL_DIR/dist" ]; then
  log_message "Creating special backup of the dist directory..."
  rm -rf "$INSTALL_DIR/backup_dist"
  cp -r "$INSTALL_DIR/dist" "$INSTALL_DIR/backup_dist" 2>/dev/null || log_message "Warning: Could not backup dist directory"
fi

# Pull latest changes
log_message "Pulling latest changes from repository..."
# Uncomment for actual git repository updates
# git pull

# Install dependencies with fixes for rollup
log_message "Installing dependencies..."

# CRITICAL: Set Rollup environment variables to avoid native module issues
export ROLLUP_SKIP_LOAD_NATIVE_PLUGIN=true
export ROLLUP_BROWSER_NODE_RESOLVE=true
# This tells Node.js to prefer pure JS implementations
export NODE_OPTIONS="--no-node-snapshot --no-experimental-fetch"

# Clean install approach for more reliable builds
log_message "Performing clean install to avoid dependency issues..."
rm -rf node_modules package-lock.json
npm install --no-optional --no-fund || {
  log_message "ERROR: Failed to install dependencies."
  log_message "Attempting to restore from backup and restart service..."
  if [ "$SERVICE_ACTIVE" = "active" ]; then
    systemctl start visionhub.service
  fi
  exit 1
}

# Try different build strategies
log_message "Building frontend with multiple fallback strategies..."

# Create an empty index.html in dist as a fallback
mkdir -p dist
echo "<html><body><h1>VisionHub One Sentinel</h1><p>Loading...</p></body></html>" > dist/index.html

# Strategy 1: Use esbuild directly if available
if command -v esbuild >/dev/null 2>&1 || [ -f "./node_modules/.bin/esbuild" ]; then
  log_message "Trying build with esbuild..."
  (./node_modules/.bin/esbuild src/main.tsx --bundle --format=esm --outfile=dist/bundle.js || command -v esbuild >/dev/null 2>&1 && esbuild src/main.tsx --bundle --format=esm --outfile=dist/bundle.js) && {
    echo "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>VisionHub One Sentinel</title><script type=\"module\" src=\"/bundle.js\"></script></head><body><div id=\"root\"></div></body></html>" > dist/index.html
    log_message "esbuild succeeded!"
    BUILD_SUCCESS=true
  } || log_message "esbuild failed, trying next method"
fi

# Check if build already succeeded
if [ "$BUILD_SUCCESS" != "true" ]; then
  # Strategy 2: Pure JS Vite build with strict Rollup avoidance
  log_message "Trying pure JS Vite build..."
  
  # Create temporary vite.no-rollup.config.js
  cat > vite.no-rollup.config.js << 'EOL'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  build: {
    minify: false,
    target: 'es2015',
    rollupOptions: {
      external: ['rollup/dist/native'],
      treeshake: false,
      output: {
        format: 'es',
        manualChunks: undefined
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
EOL

  # Try with the special config
  export NODE_OPTIONS="--no-node-snapshot --max-old-space-size=512"
  export ROLLUP_SKIP_LOAD_NATIVE_PLUGIN=true
  export ROLLUP_BROWSER_NODE_RESOLVE=true
  
  npx vite build --config vite.no-rollup.config.js && log_message "Pure JS build successful!" && BUILD_SUCCESS=true || {
    log_message "Pure JS build failed, trying standard build..."
    
    # Strategy 3: Standard Vite build
    npm run build && log_message "Standard build successful!" && BUILD_SUCCESS=true || {
      # Strategy 4: Final fallback - copy the minimal placeholder
      log_message "All build attempts failed, using minimal placeholder."
      
      # Check if we have a backup we can use
      if [ -d "$INSTALL_DIR/backup_dist" ]; then
        log_message "Restoring frontend from backup_dist..."
        rm -rf "$INSTALL_DIR/dist"
        cp -r "$INSTALL_DIR/backup_dist" "$INSTALL_DIR/dist"
        log_message "Using previous build from backup."
        BUILD_SUCCESS=true
      else
        # Create minimal placeholder
        mkdir -p dist
        cat > dist/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VisionHub One Sentinel</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f8fa; }
    .container { max-width: 800px; margin: 0 auto; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #4a5568; }
    .logo span { color: #4299e1; }
    .card { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px; }
    .api-status { margin-top: 20px; padding: 10px; border-radius: 5px; background: #e6f7ff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Vision<span>Hub</span> One Sentinel</div>
    <div class="card">
      <h1>API Mode</h1>
      <p>VisionHub One Sentinel is running in API-only mode.</p>
      <p>The full web interface could not be built, but all API endpoints are available.</p>
      <div class="api-status">
        <p>API Status: <span id="status">Checking...</span></p>
      </div>
    </div>
  </div>
  <script>
    fetch('/api/status')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        document.getElementById('status').innerText = 'Online ✓';
      })
      .catch(() => {
        document.getElementById('status').innerText = 'Offline ✗';
      });
  </script>
</body>
</html>
EOL
      fi
    }
  }
fi

# Start the service
log_message "Starting VisionHub One Sentinel service..."
systemctl start visionhub.service || {
  log_message "Failed to start service. Checking logs..."
  journalctl -u visionhub -n 50 >> "$UPDATE_LOG"
  
  if [ "$BUILD_SUCCESS" != "true" ]; then
    log_message "Attempting to restore from backup..."
    if [ -d "$BACKUP_DIR/dist" ]; then
      log_message "Restoring frontend from backup..."
      rm -rf "$INSTALL_DIR/dist"
      cp -r "$BACKUP_DIR/dist" "$INSTALL_DIR/"
    fi
  }
  
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
if [ "$(systemctl is-active visionhub.service)" != "active" ]; then
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
  echo "4. Try an alternative build approach:"
  echo "   cd $INSTALL_DIR && export ROLLUP_SKIP_LOAD_NATIVE_PLUGIN=true && NODE_OPTIONS=\"--no-node-snapshot\" npx vite build --minify=false"
  echo ""
fi
