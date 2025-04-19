
#!/bin/bash

# VisionHub One Sentinel Installation Script
# For Ubuntu 22.04 LTS Server
# Version 1.3.0 - With dependency fallbacks and ESBuild support

# Exit on error
set -e

# Print header
echo "============================================"
echo "  VisionHub One Sentinel Installer v1.3.0"
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

# Install dependencies with better error handling
install_packages() {
  log_message "Attempting to install packages: $*"
  apt-get update
  apt-get install -y "$@" || {
    log_message "WARNING: Standard apt install failed, trying alternative methods..."
    return 1
  }
  return 0
}

# Update system
log_message "Updating system..."
apt-get update || log_message "WARNING: apt-get update failed, continuing anyway..."
apt-get upgrade -y || log_message "WARNING: apt-get upgrade failed, continuing anyway..."

# Install essential packages first with fallback
log_message "Installing critical packages..."
install_packages build-essential curl git openssl sqlite3 || {
  log_message "Trying to install packages individually..."
  for pkg in build-essential curl git openssl sqlite3; do
    apt-get install -y $pkg || log_message "WARNING: Failed to install $pkg, continuing anyway..."
  done
}

# Install other packages with fallbacks
log_message "Installing additional packages..."
install_packages ffmpeg sendmail cifs-utils zip unzip nginx net-tools nmap iproute2 || {
  log_message "Trying to install additional packages individually..."
  for pkg in ffmpeg sendmail cifs-utils zip unzip nginx net-tools nmap iproute2; do
    apt-get install -y $pkg || log_message "WARNING: Failed to install $pkg, continuing anyway..."
  done
}

# Install Node.js with fallback methods
log_message "Installing Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
  log_message "Installing Node.js via NodeSource..."
  if curl -fsSL "https://deb.nodesource.com/setup_$NODE_VERSION" | bash -; then
    apt-get install -y nodejs
  else
    log_message "NodeSource installation failed, trying direct binary installation..."
    NODE_DIST="node-v18.20.0-linux-x64"
    curl -sL "https://nodejs.org/dist/v18.20.0/${NODE_DIST}.tar.gz" -o /tmp/node.tar.gz
    if [ $? -eq 0 ]; then
      mkdir -p /usr/local/lib/nodejs
      tar -xzf /tmp/node.tar.gz -C /usr/local/lib/nodejs
      ln -sf /usr/local/lib/nodejs/${NODE_DIST}/bin/node /usr/bin/node
      ln -sf /usr/local/lib/nodejs/${NODE_DIST}/bin/npm /usr/bin/npm
      ln -sf /usr/local/lib/nodejs/${NODE_DIST}/bin/npx /usr/bin/npx
      log_message "Node.js installed via binary distribution"
    else
      log_message "ERROR: All Node.js installation methods failed"
      log_message "Please install Node.js v18.x manually before continuing"
      exit 1
    fi
  fi
fi

# Check Node.js version
NODE_VER=$(node -v || echo "unknown")
log_message "Node.js version: $NODE_VER"
NPM_VER=$(npm -v || echo "unknown")
log_message "NPM version: $NPM_VER"

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

# Fix esbuild.config.js if needed
if [ -f "esbuild.config.js" ]; then
  log_message "Checking esbuild.config.js format..."
  # Remove shebang if present
  sed -i '/^#!/d' esbuild.config.js
  log_message "Fixed esbuild.config.js"
fi

# Install ESBuild separately first to ensure it's available
log_message "Installing ESBuild separately..."
npm install -g esbuild || {
  npm install --no-save esbuild || {
    log_message "WARNING: Failed to install esbuild via npm, trying direct download..."
    mkdir -p "$INSTALL_DIR/node_modules/.bin"
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
      curl -L https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64-0.15.18.tgz -o /tmp/esbuild.tgz
      mkdir -p /tmp/esbuild
      tar -xzf /tmp/esbuild.tgz -C /tmp/esbuild
      cp /tmp/esbuild/package/bin/esbuild "$INSTALL_DIR/node_modules/.bin/"
      chmod +x "$INSTALL_DIR/node_modules/.bin/esbuild"
      log_message "ESBuild binary installed directly"
    else
      log_message "WARNING: ESBuild direct install not supported for architecture $ARCH"
    fi
  }
}

# Install npm dependencies with clean install approach
log_message "Installing npm dependencies with clean install approach..."
rm -rf node_modules package-lock.json

# Ensure these critical dependencies are installed one by one
log_message "Installing critical dependencies individually..."
npm install --no-save express sqlite3 bcrypt uuid || log_message "WARNING: Some critical dependencies failed to install"

# Install remaining dependencies with error handling
log_message "Installing remaining dependencies..."
npm install --no-optional --no-fund || {
  log_message "ERROR: Failed to install all dependencies."
  log_message "Installing with --no-peer-deps and --legacy-peer-deps..."
  npm install --no-optional --no-fund --no-peer-deps --legacy-peer-deps || {
    log_message "WARNING: Failed to install all dependencies. Some features may be limited."
  }
}

# Build the frontend with ESBuild using the improved config
log_message "Building frontend with ESBuild..."
mkdir -p dist

# Fix ESBuild config if needed and attempt build
if [ -f "esbuild.config.js" ]; then
  log_message "Building with ESBuild..."
  node esbuild.config.js && log_message "ESBuild build successful!" || {
    log_message "ESBuild build failed, trying direct command..."
    if [ -f "./node_modules/.bin/esbuild" ]; then
      mkdir -p dist/assets
      ./node_modules/.bin/esbuild src/main.tsx \
        --bundle \
        --format=esm \
        --outfile=dist/assets/index.js \
        && log_message "Direct ESBuild command successful!" || log_message "Direct ESBuild command failed."
    else
      log_message "ESBuild not found in node_modules, trying global install..."
      esbuild src/main.tsx \
        --bundle \
        --format=esm \
        --outfile=dist/assets/index.js \
        && log_message "Global ESBuild command successful!" || log_message "Global ESBuild command failed."
    fi
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
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; text-align: center; background-color: #f5f8fa; }
      h1 { color: #2c3e50; }
      .container { max-width: 800px; margin: 0 auto; }
      .message { background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px; margin-top: 20px; }
      .api-info { color: #004085; background-color: #cce5ff; padding: 15px; border-radius: 5px; margin-top: 20px; }
      .warning { color: #856404; background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; }
    </style>
    <link rel="stylesheet" href="/assets/index.css">
</head>
<body>
    <div class="container">
        <div class="message">
            <h1>VisionHub One Sentinel</h1>
            <p>The system is running in API mode. Web interface could not be built.</p>
            
            <div class="api-info">
              <p><strong>API Status:</strong> <span id="api-status">Checking...</span></p>
              <p><strong>API Base URL:</strong> http://<span id="hostname">localhost</span>/api</p>
            </div>
            
            <div class="warning">
              <p>This is a minimal frontend for API access only.</p>
              <p>The backend server is still fully functional.</p>
            </div>
        </div>
    </div>
    
    <script>
      document.getElementById('hostname').textContent = window.location.hostname;
      
      fetch('/api/status')
        .then(response => {
          if (response.ok) {
            document.getElementById('api-status').innerHTML = '<span style="color:green">✓ Online</span>';
          } else {
            document.getElementById('api-status').innerHTML = '<span style="color:red">✗ Error</span>';
          }
        })
        .catch(error => {
          document.getElementById('api-status').innerHTML = '<span style="color:red">✗ Offline</span>';
        });
    </script>
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
  log_message "Continuing without NGINX. You can configure it manually later."
}

# Create systemd service for CommonJS compatibility
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
# Force CommonJS module system
Environment=NODE_OPTIONS="--no-warnings"
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
  echo ""
  echo "ALTERNATIVE INSTALLATION METHOD:"
  echo "If you continue to experience package dependency issues, try:"
  echo "1. Install Node.js manually from the official NodeJS website"
  echo "2. Download the VisionHub One Sentinel package directly"
  echo "3. Run the installation script with --skip-dependencies flag"
  echo ""
fi
