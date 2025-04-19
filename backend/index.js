
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const cookieParser = require('cookie-parser');

// Import middleware
const databaseMiddleware = require('./middleware/databaseMiddleware');
const authMiddleware = require('./middleware/authMiddleware');

// Import routes
const cameraRoutes = require('./routes/cameraRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const recordingRoutes = require('./routes/recordingRoutes');
const eventRoutes = require('./routes/eventRoutes');
const authRoutes = require('./routes/authRoutes');

// Import utils
const { initWebSocketServer } = require('./utils/websocketManager');
const { stopAllRecordings } = require('./utils/recordingEngine');
const { startMonitoring } = require('./utils/cameraMonitor');
const { initializeStorage } = require('./utils/storageManager');
const { getSystemDiagnostics } = require('./utils/systemMonitor');
const { initializeDatabase } = require('./utils/databaseInit');

// Configure environment variables
const PORT = process.env.PORT || 3000;
// Set the database path to /var/visionhub/db/users.db
const DB_PATH = process.env.DB_PATH || '/var/visionhub/db/visionhub.db';

// Create DB directory if it doesn't exist
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created database directory at ${dbDir}`);
  } catch (err) {
    console.error(`Failed to create database directory at ${dbDir}:`, err);
    // Continue with fallback to project directory
  }
}

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

// Ensure the dist directory exists
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log(`Serving static files from ${distPath}`);
} else {
  console.error(`Warning: Static directory ${distPath} does not exist`);
}

// Ensure other directories exist or create them
const backupsDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupsDir)) {
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
    console.log(`Created backups directory at ${backupsDir}`);
  } catch (err) {
    console.error(`Failed to create backups directory:`, err);
  }
}

const recordingsDir = path.join(__dirname, '../recordings');
if (!fs.existsSync(recordingsDir)) {
  try {
    fs.mkdirSync(recordingsDir, { recursive: true });
    console.log(`Created recordings directory at ${recordingsDir}`);
  } catch (err) {
    console.error(`Failed to create recordings directory:`, err);
  }
}

app.use('/backups', express.static(backupsDir));
app.use('/recordings', express.static(recordingsDir));

// Create HTTP or HTTPS server based on settings
let server;

// Initialize database middleware
app.use(databaseMiddleware(DB_PATH));

// Store the database path for later reference
app.set('dbPath', DB_PATH);

// Function to initialize the server
async function initializeServer() {
  try {
    console.log(`Initializing server with database at: ${DB_PATH}`);
    
    // Initialize database tables first
    const db = app.get('db');
    console.log('Initializing database tables...');
    initializeDatabase(db);
    
    // Check if SSL is enabled
    let settings;
    try {
      settings = await new Promise((resolve, reject) => {
        db.get('SELECT ssl_enabled, ssl_cert_path, ssl_key_path FROM settings WHERE id = 1', [], (err, row) => {
          if (err) {
            console.error('Error querying settings:', err);
            reject(err);
          } else {
            resolve(row || { ssl_enabled: 0 });
          }
        });
      });
      console.log('Settings loaded:', settings);
    } catch (err) {
      console.error('Failed to query settings, using defaults:', err);
      settings = { ssl_enabled: 0 };
    }
    
    // Check if SSL is enabled and certificates exist
    if (settings.ssl_enabled && settings.ssl_cert_path && settings.ssl_key_path) {
      try {
        // Resolve paths (SSL paths are stored as /ssl/file.crt, but actual path is relative to project root)
        const certPath = path.join(__dirname, '..', settings.ssl_cert_path);
        const keyPath = path.join(__dirname, '..', settings.ssl_key_path);
        
        console.log(`Loading SSL certificates from: ${certPath} and ${keyPath}`);
        
        // Check if files exist
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
          const options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
          };
          
          server = https.createServer(options, app);
          console.log('HTTPS server created with SSL certificates');
        } else {
          console.warn(`SSL certificates not found at ${certPath} or ${keyPath}, falling back to HTTP`);
          server = http.createServer(app);
        }
      } catch (error) {
        console.error('Error creating HTTPS server:', error);
        console.warn('Falling back to HTTP server');
        server = http.createServer(app);
      }
    } else {
      // Create standard HTTP server
      console.log('Creating HTTP server (SSL not enabled in settings)');
      server = http.createServer(app);
    }

    // Initialize WebSocket server
    try {
      console.log('Initializing WebSocket server...');
      initWebSocketServer(server);
    } catch (err) {
      console.error('Failed to initialize WebSocket server:', err);
    }

    // Initialize storage
    try {
      console.log('Initializing storage...');
      const storagePath = await initializeStorage(app.get('db'));
      console.log(`Storage initialized at: ${storagePath}`);
    } catch (err) {
      console.error('Storage initialization error:', err);
    }

    // API Routes
    console.log('Setting up API routes...');
    app.use('/api/auth', authRoutes);
    app.use('/api/cameras', cameraRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/recordings', recordingRoutes);
    app.use('/api/events', eventRoutes);
    
    // Diagnostics route
    app.get('/api/diagnostics', async (req, res) => {
      try {
        const diagnostics = await getSystemDiagnostics(req.db);
        res.json(diagnostics);
      } catch (error) {
        console.error('Error getting diagnostics:', error);
        res.status(500).json({ error: 'Failed to get system diagnostics' });
      }
    });
    
    // Start camera monitoring
    try {
      console.log('Starting camera monitoring...');
      const monitoringInterval = startMonitoring(app.get('db'));
    } catch (err) {
      console.error('Failed to start camera monitoring:', err);
    }

    // Catch-all route for SPA
    app.get('*', (req, res) => {
      const indexPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`Error: index.html not found at ${indexPath}`);
        res.status(500).send('Server Error: index.html not found');
      }
    });

    // Start server
    server.listen(PORT, () => {
      const protocol = server instanceof https.Server ? 'HTTPS' : 'HTTP';
      console.log(`VisionHub One Sentinel backend running on ${protocol} port ${PORT}`);
      
      // Log system start event
      try {
        const eventId = uuidv4();
        const eventSql = `INSERT INTO events (id, timestamp, event_type, message, severity) 
                        VALUES (?, ?, ?, ?, ?)`;
        app.get('db').run(eventSql, [
          eventId,
          new Date().toISOString(),
          'system_started',
          `VisionHub One Sentinel system started (${protocol})`,
          'info'
        ]);
      } catch (err) {
        console.error('Failed to log system start event:', err);
      }
    });
    
    return server;
  } catch (error) {
    console.error('Server initialization error:', error);
    throw error;
  }
}

// Handle graceful shutdown
function handleShutdown() {
  console.log('Shutting down gracefully...');
  
  try {
    // Stop all recordings
    stopAllRecordings(app.get('db'));
    
    // Close database
    if (app.get('db')) {
      app.get('db').close();
    }
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
  
  process.exit(0);
}

// Initialize and start server
console.log('Starting VisionHub One Sentinel backend server...');
initializeServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle graceful shutdown signals
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  handleShutdown();
});
