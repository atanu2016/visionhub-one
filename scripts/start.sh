
#!/bin/bash

# VisionHub One Sentinel Startup Script
# Version 1.2.0 - With improved Rollup workarounds

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
export ROLLUP_BROWSER_NODE_RESOLVE=true
# This tells Node.js to prefer pure JS implementations
export NODE_OPTIONS="--no-node-snapshot --no-experimental-fetch --no-warnings"

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

# Check if node_modules exists - if not, try a minimal install
if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Installing minimal dependencies..."
  npm install --no-optional express sqlite3 uuid bcrypt cookie-parser jsonwebtoken
  # Add any other critical backend dependencies here
fi

# Create a temporary success file to track successful starts
touch "$LOG_DIR/startup_in_progress"

# Try to repair the database if it exists but might be corrupted
if [ -f "$DB_PATH" ]; then
  echo "Checking database integrity..."
  if ! sqlite3 "$DB_PATH" "PRAGMA integrity_check;" > /dev/null 2>&1; then
    echo "Warning: Database may be corrupted. Creating backup and attempting repair..."
    cp "$DB_PATH" "${DB_PATH}.backup-$(date +%Y%m%d%H%M%S)"
    sqlite3 "$DB_PATH" "VACUUM;" || echo "Failed to repair database. Will recreate if needed."
  fi
fi

# Create a minimal frontend if dist directory doesn't exist
if [ ! -d "dist" ]; then
  echo "Frontend not built yet. Creating minimal frontend..."
  mkdir -p "dist"
  cat > "dist/index.html" << EOL
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VisionHub One Sentinel - API Mode</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; text-align: center; background-color: #f5f8fa; }
    h1 { color: #2c3e50; }
    .container { max-width: 800px; margin: 0 auto; }
    .message { background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px; margin-top: 20px; }
    .api-info { color: #004085; background-color: #cce5ff; padding: 15px; border-radius: 5px; margin-top: 20px; }
    .warning { color: #856404; background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; }
    .login-form { margin-top: 30px; padding: 20px; border: 1px solid #e1e4e8; border-radius: 5px; }
    input { padding: 10px; margin: 5px 0; width: 100%; border: 1px solid #ddd; border-radius: 4px; }
    button { background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 10px; }
    button:hover { background: #3182ce; }
    .error { color: #e53e3e; margin-top: 10px; }
    .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #4a5568; }
    .logo span { color: #4299e1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Vision<span>Hub</span> One Sentinel</div>
    
    <div class="message">
      <h1>Welcome to VisionHub One Sentinel</h1>
      <p>Backend API Server Mode</p>
      
      <div class="api-info">
        <p><strong>API Status:</strong> <span id="api-status">Checking...</span></p>
        <p><strong>API Base URL:</strong> http://<span id="hostname">localhost</span>/api</p>
      </div>
      
      <div class="login-form">
        <h2>Admin Login</h2>
        <form id="login-form">
          <div>
            <input type="text" id="username" placeholder="Username" value="admin" />
          </div>
          <div>
            <input type="password" id="password" placeholder="Password" value="Admin123!" />
          </div>
          <button type="submit">Login</button>
          <div id="login-message" class="error"></div>
        </form>
        <div id="login-success" style="display:none; color:green; margin-top:10px;"></div>
      </div>
      
      <div class="warning">
        <p>This is a minimal frontend for API access only.</p>
        <p>The full web interface could not be built, but all API endpoints are available.</p>
      </div>
    </div>
  </div>
  
  <script>
    document.getElementById('hostname').textContent = window.location.hostname;
    
    // Basic API connectivity test
    fetch('/api/status')
      .then(response => {
        if (response.ok) {
          document.getElementById('api-status').innerHTML = '<span style="color:green">✓ Online</span>';
          return response.json();
        } else {
          document.getElementById('api-status').innerHTML = '<span style="color:red">✗ Error</span>';
          throw new Error('API status check failed');
        }
      })
      .then(data => {
        if (data && data.version) {
          document.getElementById('api-status').innerHTML += ' (v' + data.version + ')';
        }
      })
      .catch(error => {
        console.error('API check error:', error);
      });
      
    // Handle login form submission
    document.getElementById('login-form').addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const loginMessage = document.getElementById('login-message');
      const loginSuccess = document.getElementById('login-success');
      const loginForm = document.getElementById('login-form');
      
      loginMessage.textContent = '';
      loginSuccess.style.display = 'none';
      
      fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Login failed: ' + response.statusText);
        }
      })
      .then(data => {
        loginMessage.textContent = '';
        loginSuccess.textContent = 'Login successful! You are now authenticated.';
        loginSuccess.style.display = 'block';
        loginForm.reset();
        
        // Store token in localStorage
        localStorage.setItem('visionhub_token', data.token);
        
        // Show token information
        loginSuccess.innerHTML += '<br><small>Token received and stored for API access.</small>';
      })
      .catch(error => {
        loginMessage.textContent = error.message || 'Failed to login';
      });
    });
  </script>
</body>
</html>
EOL
fi

# Start the server with better error handling and more detailed output
echo "Starting VisionHub One Sentinel backend server..."

# Create a debug log function
debug_log() {
  echo "$1"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_DIR/startup.log"
}

# Check if backend/index.js exists
if [ ! -f "backend/index.js" ]; then
  debug_log "ERROR: backend/index.js not found! Cannot start service."
  exit 1
fi

# More robust server start with explicit node flags
debug_log "Starting Node.js server with explicit flags..."
NODE_OPTIONS="--no-node-snapshot --trace-warnings --no-warnings" \
ROLLUP_SKIP_LOAD_NATIVE_PLUGIN=true \
ROLLUP_BROWSER_NODE_RESOLVE=true \
node backend/index.js 2>&1 | tee -a "$LOG_DIR/startup.log" || {
  debug_log "Failed to start server. Check logs at $LOG_DIR/startup.log"
  debug_log "Checking for known issues..."
  
  # Check database file permissions
  if [ -f "$DB_PATH" ]; then
    debug_log "Database file permissions: $(ls -la $DB_PATH)"
  else
    debug_log "WARNING: Database file not found at $DB_PATH. Will be created on first successful start."
  fi
  
  # Check directory permissions
  debug_log "DB directory permissions: $(ls -la $DB_DIR)"
  debug_log "Log directory permissions: $(ls -la $LOG_DIR)"
  
  # Print disk space
  debug_log "Checking disk space:"
  df -h | grep -E "(Filesystem|/$|$STORAGE_PATH)" | tee -a "$LOG_DIR/startup.log"
  
  # Check Node.js version
  debug_log "Node.js version: $(node -v)"
  
  # Try to display any Node.js errors more clearly
  debug_log "Attempting to start with more verbose error output..."
  NODE_OPTIONS="--no-node-snapshot --trace-warnings" node -e "try { require('./backend/index.js') } catch(e) { console.error('Startup Error:', e) }" 2>&1 | tee -a "$LOG_DIR/startup_errors.log"
  
  # Provide more detailed troubleshooting steps
  cat >> "$LOG_DIR/troubleshooting.txt" << 'EOL'
VisionHub One Sentinel Troubleshooting Guide
===========================================

If the service fails to start, try these advanced troubleshooting steps:

1. Check for backend JavaScript syntax errors:
   node -c backend/index.js

2. Try starting with minimal dependencies:
   cd /opt/visionhub-sentinel
   NODE_ENV=production node backend/index.js

3. Verify database file access:
   sqlite3 /var/visionhub/db/visionhub.db .tables

4. Check for port conflicts:
   netstat -tulpn | grep 3000

5. Reset permissions:
   sudo chown -R root:root /opt/visionhub-sentinel
   sudo chmod -R 755 /opt/visionhub-sentinel
   sudo chmod -R 777 /var/visionhub
   sudo chmod -R 777 /var/log/visionhub

6. Try with an empty database (backup first!):
   mv /var/visionhub/db/visionhub.db /var/visionhub/db/visionhub.db.bak
   sqlite3 /var/visionhub/db/visionhub.db "CREATE TABLE settings (id TEXT PRIMARY KEY);"

7. Reinstall critical dependencies:
   cd /opt/visionhub-sentinel
   npm install --no-optional express sqlite3 uuid bcrypt cookie-parser

For additional help, check the full logs in /var/log/visionhub/
EOL
  
  debug_log "Troubleshooting guide written to $LOG_DIR/troubleshooting.txt"
  exit 1
}

# If execution gets to this point, remove the in-progress file
rm -f "$LOG_DIR/startup_in_progress"
touch "$LOG_DIR/startup_success"
debug_log "Service started successfully!"
