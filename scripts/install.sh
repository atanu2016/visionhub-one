#!/bin/bash

# VisionHub One Sentinel Installation Script
# For Ubuntu 22.04 LTS Server
# Version 1.2.1 - With Rollup fixes

# Exit on error
set -e

# Print header
echo "============================================"
echo "  VisionHub One Sentinel Installer v1.2.1"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this script as root."
  echo "Use: sudo ./install.sh"
  exit 1
fi

# Default variables
INSTALL_DIR="/opt/visionhub-sentinel"
STORAGE_DIR="/var/visionhub"
LOG_DIR="/var/log/visionhub"
DB_DIR="$STORAGE_DIR/db"
RECORDINGS_DIR="$STORAGE_DIR/recordings"
FRONTEND_PORT=80
BACKEND_PORT=3000
REPO_URL="https://github.com/yourusername/visionhub-sentinel.git"
NODE_VERSION="18.x"
INSTALL_LOG="$LOG_DIR/install.log"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -d|--directory)
      INSTALL_DIR="$2"
      shift 2
      ;;
    -p|--port)
      FRONTEND_PORT="$2"
      shift 2
      ;;
    -b|--backend-port)
      BACKEND_PORT="$2"
      shift 2
      ;;
    --help)
      echo "Usage: sudo ./install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -d, --directory DIR    Installation directory (default: /opt/visionhub-sentinel)"
      echo "  -p, --port PORT        Frontend port (default: 80)"
      echo "  -b, --backend-port PORT Backend port (default: 3000)"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information."
      exit 1
      ;;
  esac
done

# Function to log messages
log_message() {
  local msg="$1"
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo "[$timestamp] $msg"
  if [ -d "$LOG_DIR" ]; then
    echo "[$timestamp] $msg" >> "$INSTALL_LOG"
  fi
}

echo "VisionHub One Sentinel will be installed with these settings:"
echo "- Installation directory: $INSTALL_DIR"
echo "- Storage directory: $STORAGE_DIR"
echo "- Database directory: $DB_DIR"
echo "- Recordings directory: $RECORDINGS_DIR"
echo "- Logs directory: $LOG_DIR"
echo "- Frontend port: $FRONTEND_PORT"
echo "- Backend port: $BACKEND_PORT"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read -r

# Create directories
log_message "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$STORAGE_DIR"
mkdir -p "$DB_DIR"
mkdir -p "$RECORDINGS_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$INSTALL_DIR/ssl"
touch "$INSTALL_LOG"

# Set proper permissions early
chmod -R 777 "$STORAGE_DIR"
chmod -R 777 "$LOG_DIR"

# Install dependencies
log_message "Updating system and installing dependencies..."
apt-get update
apt-get upgrade -y

# Install required packages
log_message "Installing required packages..."
apt-get install -y \
  ffmpeg \
  sqlite3 \
  sendmail \
  cifs-utils \
  zip \
  unzip \
  nginx \
  build-essential \
  git \
  openssl \
  net-tools \
  nmap \
  iproute2 \
  npm || {
    log_message "ERROR: Failed to install required packages."
    exit 1
  }

# Install Node.js
log_message "Installing Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_$NODE_VERSION" | bash -
  apt-get install -y nodejs
fi

# Check if the code repository exists (local or git)
if [ -f "./package.json" ]; then
  log_message "Using local files for installation..."
  cp -r ./* "$INSTALL_DIR/"
  cp -r ./.* "$INSTALL_DIR/" 2>/dev/null || true
elif [ -d ".git" ]; then
  log_message "Using local git repository for installation..."
  cp -r ./* "$INSTALL_DIR/"
  cp -r ./.* "$INSTALL_DIR/" 2>/dev/null || true
else
  log_message "Cloning repository..."
  # For a real installation, you would use git clone
  # git clone $REPO_URL "$INSTALL_DIR"
  log_message "NOTE: In this demo, we're using local files. In a real installation, you would clone from a git repository."
  cp -r ./* "$INSTALL_DIR/"
  cp -r ./.* "$INSTALL_DIR/" 2>/dev/null || true
fi

# Navigate to the installation directory
cd "$INSTALL_DIR" || { 
  log_message "Failed to change to installation directory"
  exit 1
}

# Install npm dependencies with clean install approach that avoids Rollup issues
log_message "Installing npm dependencies with clean install approach..."
rm -rf node_modules package-lock.json

# First install esbuild separately to ensure it's available
npm install --no-optional esbuild || {
  log_message "Failed to install esbuild. This is required for the build process."
  exit 1
}

# Then install other dependencies
npm install --no-optional || {
  log_message "Error during npm install. Trying with basic dependencies only..."
  npm install --no-optional react react-dom express sqlite3 || {
    log_message "ERROR: Failed to install even basic dependencies."
    exit 1
  }
}

# Try different build strategies
log_message "Building frontend with multiple fallback strategies..."
mkdir -p dist

# Strategy 1: Direct ESBuild approach
if [ -f "esbuild.config.js" ]; then
  log_message "Building with ESBuild..."
  node esbuild.config.js && log_message "ESBuild build successful!" || {
    log_message "ESBuild build failed, trying direct command..."
    ./node_modules/.bin/esbuild src/main.tsx \
      --bundle \
      --format=esm \
      --outfile=dist/assets/index.js \
      || log_message "Direct ESBuild command failed too."
  }
fi

# If build failed, create a minimal frontend
if [ ! -f "dist/assets/index.js" ]; then
  log_message "Creating minimal frontend as fallback..."
  mkdir -p dist/assets
  echo "/* Minimal CSS */" > dist/assets/index.css
  
  # Create a basic index.html
  cat > dist/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VisionHub One Sentinel</title>
    <link rel="stylesheet" href="/assets/index.css">
</head>
<body>
    <div id="root">Loading VisionHub One Sentinel...</div>
</body>
</html>
EOL
fi

# Create environment file for backend
log_message "Creating environment configuration..."
cat > "$INSTALL_DIR/.env" << EOL
NODE_ENV=production
PORT=$BACKEND_PORT
DB_PATH=$DB_DIR/visionhub.db
STORAGE_PATH=$RECORDINGS_DIR
LOG_PATH=$LOG_DIR
JWT_SECRET=$(openssl rand -base64 32)
ROLLUP_SKIP_LOAD_NATIVE_PLUGIN=true
EOL

# Set up NGINX configuration
log_message "Setting up NGINX configuration..."
cat > /etc/nginx/sites-available/visionhub << EOL
server {
    listen $FRONTEND_PORT default_server;
    server_name _;

    access_log $LOG_DIR/nginx-access.log;
    error_log $LOG_DIR/nginx-error.log;

    location / {
        root $INSTALL_DIR/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /recordings/ {
        alias $RECORDINGS_DIR/;
        autoindex off;
    }
}
EOL

# Enable the NGINX site
ln -sf /etc/nginx/sites-available/visionhub /etc/nginx/sites-enabled/ || log_message "Failed to create symbolic link"
rm -f /etc/nginx/sites-enabled/default || log_message "Failed to remove default site"
nginx -t && systemctl restart nginx || {
  log_message "ERROR: NGINX configuration test failed or restart failed."
  exit 1
}

# Update the service file to use CommonJS
log_message "Creating systemd service with CommonJS configuration..."
cat > /etc/systemd/system/visionhub.service << EOL
[Unit]
Description=VisionHub One Sentinel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=$BACKEND_PORT
Environment=DB_PATH=$DB_DIR/visionhub.db
Environment=STORAGE_PATH=$RECORDINGS_DIR
Environment=LOG_PATH=$LOG_DIR
Environment=JWT_SECRET=$(openssl rand -base64 32)
ExecStart=/usr/bin/node backend/index.js
Restart=on-failure
RestartSec=10s
StandardOutput=append:$LOG_DIR/visionhub.log
StandardError=append:$LOG_DIR/visionhub-error.log

[Install]
WantedBy=multi-user.target
EOL

# Initialize the database directory and files
log_message "Initializing database..."
sqlite3 "$DB_DIR/visionhub.db" ".databases" || {
  log_message "WARNING: Failed to create initial database. Will be created on first run."
}

# Ensure proper permissions on files
log_message "Setting permissions..."
chown -R root:root "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"
chmod -R 777 "$STORAGE_DIR"
chmod -R 777 "$LOG_DIR"

# Generate a self-signed SSL certificate
log_message "Generating self-signed SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$INSTALL_DIR/ssl/visionhub.key" \
  -out "$INSTALL_DIR/ssl/visionhub.crt" \
  -subj "/CN=visionhub.local" || {
    log_message "WARNING: Failed to generate SSL certificate."
  }

# Create the initial SQL database
log_message "Initializing database with SQL..."
if [ -f "$INSTALL_DIR/backend/migrations/init.sql" ]; then
  cat "$INSTALL_DIR/backend/migrations/init.sql" | sqlite3 "$DB_DIR/visionhub.db" || {
    log_message "WARNING: Failed to execute init.sql. Will be handled by application."
  }
else
  log_message "WARNING: init.sql not found. Database will be initialized by the application."
fi

if [ -f "$INSTALL_DIR/backend/migrations/auth.sql" ]; then
  cat "$INSTALL_DIR/backend/migrations/auth.sql" | sqlite3 "$DB_DIR/visionhub.db" || {
    log_message "WARNING: Failed to execute auth.sql. Will be handled by application."
  }
else
  log_message "WARNING: auth.sql not found. User tables will be initialized by the application."
fi

# Update the database with the SSL certificate paths
sqlite3 "$DB_DIR/visionhub.db" "CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, ssl_enabled INTEGER, ssl_cert_path TEXT, ssl_key_path TEXT);" || {
  log_message "WARNING: Failed to create settings table. Will be handled by application."
}
sqlite3 "$DB_DIR/visionhub.db" "INSERT OR REPLACE INTO settings (id, ssl_enabled, ssl_cert_path, ssl_key_path) VALUES ('1', 0, '/ssl/visionhub.crt', '/ssl/visionhub.key');" || {
  log_message "WARNING: Failed to insert SSL settings. Will be handled by application."
}

# Create a backup of the dist directory for future use
if [ -d "$INSTALL_DIR/dist" ]; then
  log_message "Creating backup of successful build..."
  cp -r "$INSTALL_DIR/dist" "$INSTALL_DIR/backup_dist"
fi

# Enable and start the service with better error handling
log_message "Enabling and starting VisionHub service..."
systemctl daemon-reload
systemctl enable visionhub

log_message "Starting VisionHub service. This may take a moment..."
systemctl start visionhub || {
  log_message "WARNING: Service failed to start on first attempt. Waiting 5 seconds and trying again..."
  sleep 5
  systemctl start visionhub || {
    log_message "ERROR: Failed to start visionhub service. Check logs with: journalctl -u visionhub -n 50"
    journalctl -u visionhub -n 50 >> "$INSTALL_LOG"
    
    log_message "Attempting to start service with direct script..."
    bash "$INSTALL_DIR/scripts/start.sh" &
    
    log_message "Direct start attempt initiated. Check logs for progress."
  }
}

# Wait for service to stabilize
sleep 5

# Final check and display IP information
echo ""
echo "============================================"
echo "  VisionHub One Sentinel Installation Complete"
echo "============================================"
echo ""
echo "Your system is now configured!"
echo ""
echo "Access VisionHub One Sentinel at:"
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo "http://$IP_ADDRESS"
echo ""
echo "Default login credentials:"
echo "Username: admin"
echo "Password: Admin123!"
echo ""
echo "IMPORTANT: Change the default password immediately after logging in."
echo ""
echo "System Information:"
echo "- Service status: $(systemctl is-active visionhub)"
echo "- NGINX status: $(systemctl is-active nginx)"
echo "- Install directory: $INSTALL_DIR"
echo "- Storage directory: $STORAGE_DIR"
echo "- Logs: $LOG_DIR"
echo ""
echo "To view service logs:"
echo "  sudo journalctl -u visionhub -f"
echo ""
echo "For troubleshooting, check:"
echo "  $LOG_DIR/visionhub.log"
echo "  $LOG_DIR/visionhub-error.log"
echo "  $LOG_DIR/nginx-access.log"
echo "  $LOG_DIR/nginx-error.log"
echo ""
echo "Thank you for installing VisionHub One Sentinel!"
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
  echo "3. Check permissions on $DB_DIR and $LOG_DIR"
  echo "4. Run start script directly: sudo $INSTALL_DIR/scripts/start.sh"
  echo "5. Try the backend without frontend build:"
  echo "   cd $INSTALL_DIR && node backend/index.js"
  echo "6. If the frontend build issue persists, you can try:"
  echo "   cd $INSTALL_DIR && export ROLLUP_SKIP_LOAD_NATIVE_PLUGIN=true && export NODE_OPTIONS=\"--no-node-snapshot\" && npx vite build --minify=false"
  echo ""
  echo "ALTERNATIVE DEPLOYMENT OPTION:"
  echo "If you continue to experience issues with the build process, consider:"
  echo "1. Building the frontend on another machine with the same architecture"
  echo "2. Copying the resulting 'dist' directory to $INSTALL_DIR on this server"
  echo "3. Restarting the service: sudo systemctl restart visionhub"
  echo ""
fi
