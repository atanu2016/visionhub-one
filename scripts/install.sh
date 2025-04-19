
#!/bin/bash

# VisionHub One Sentinel Installation Script
# For Ubuntu 22.04 LTS Server

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
echo "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$STORAGE_DIR"
mkdir -p "$DB_DIR"
mkdir -p "$RECORDINGS_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$INSTALL_DIR/ssl"

# Install dependencies
echo "Updating system and installing dependencies..."
apt-get update
apt-get upgrade -y

# Install Node.js
echo "Installing Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_$NODE_VERSION" | bash -
  apt-get install -y nodejs
fi

# Install required packages
echo "Installing required packages..."
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
  iproute2

# Check if the code repository exists (local or git)
if [ -f "./package.json" ]; then
  echo "Using local files for installation..."
  cp -r ./* "$INSTALL_DIR/"
elif [ -d ".git" ]; then
  echo "Using local git repository for installation..."
  cp -r ./* "$INSTALL_DIR/"
else
  echo "Cloning repository..."
  # For a real installation, you would use git clone
  # git clone $REPO_URL "$INSTALL_DIR"
  echo "NOTE: In this demo, we're using local files. In a real installation, you would clone from a git repository."
  cp -r ./* "$INSTALL_DIR/"
fi

# Navigate to the installation directory
cd "$INSTALL_DIR"

# Install npm dependencies
echo "Installing npm dependencies..."
npm install

# Build the frontend
echo "Building frontend..."
npm run build

# Create environment file for backend
echo "Creating environment configuration..."
cat > "$INSTALL_DIR/.env" << EOL
NODE_ENV=production
PORT=$BACKEND_PORT
DB_PATH=$DB_DIR/visionhub.db
STORAGE_PATH=$RECORDINGS_DIR
LOG_PATH=$LOG_DIR
JWT_SECRET=$(openssl rand -base64 32)
EOL

# Set up NGINX configuration
echo "Setting up NGINX configuration..."
cat > /etc/nginx/sites-available/visionhub << EOL
server {
    listen $FRONTEND_PORT;
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
ln -sf /etc/nginx/sites-available/visionhub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Create systemd service file
echo "Creating systemd service..."
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
ExecStart=/usr/bin/node $INSTALL_DIR/backend/index.js
Restart=on-failure
StandardOutput=append:$LOG_DIR/visionhub.log
StandardError=append:$LOG_DIR/visionhub-error.log

[Install]
WantedBy=multi-user.target
EOL

# Enable and start the service
echo "Enabling and starting VisionHub service..."
systemctl daemon-reload
systemctl enable visionhub
systemctl start visionhub

# Set proper permissions
echo "Setting permissions..."
chown -R root:root "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"
chmod -R 777 "$STORAGE_DIR"
chmod -R 777 "$LOG_DIR"

# Create default admin user
echo "Ensuring default admin user exists..."
# Note: The default admin user is already created during database initialization
# in backend/migrations/auth.sql with username "admin" and password "Admin123!"

# Generate a self-signed SSL certificate
echo "Generating self-signed SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$INSTALL_DIR/ssl/visionhub.key" \
  -out "$INSTALL_DIR/ssl/visionhub.crt" \
  -subj "/CN=visionhub.local"

# Update the database with the SSL certificate paths
sqlite3 "$DB_DIR/visionhub.db" "UPDATE settings SET ssl_cert_path = '/ssl/visionhub.crt', ssl_key_path = '/ssl/visionhub.key' WHERE id = '1';"

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

exit 0
