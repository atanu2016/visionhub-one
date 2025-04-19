
// Use CommonJS syntax for backend code - explicitly marked as CommonJS
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
    // Create a fallback directory in current working directory
    const fallbackDir = path.join(process.cwd(), 'data');
    try {
      fs.mkdirSync(fallbackDir, { recursive: true });
      console.log(`Created fallback database directory at ${fallbackDir}`);
    } catch (fbErr) {
      console.error('Failed to create fallback directory:', fbErr);
    }
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
  console.warn(`Static directory ${distPath} not found - creating minimal placeholder`);
  try {
    fs.mkdirSync(distPath, { recursive: true });
    
    // Create a minimal index.html for API-only mode
    const indexHtml = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VisionHub One Sentinel API</title>
        <style>
          body { font-family: sans-serif; text-align: center; margin: 50px; }
          .container { max-width: 800px; margin: 0 auto; }
          .status { padding: 15px; margin: 20px 0; border-radius: 5px; }
          .ok { background-color: #d4edda; color: #155724; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>VisionHub One Sentinel</h1>
          <p>Backend API is running.</p>
          <div class="status ok">
            <strong>API Status:</strong> Online
          </div>
          <p>API endpoints available at /api/*</p>
        </div>
      </body>
      </html>`;
    
    fs.writeFileSync(path.join(distPath, 'index.html'), indexHtml);
    console.log('Created minimal index.html placeholder');
    
    app.use(express.static(distPath));
  } catch (e) {
    console.error('Failed to create minimal frontend placeholder:', e);
  }
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

const recordingsDir = process.env.STORAGE_PATH || path.join(__dirname, '../recordings');
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
    
    if (!db) {
      throw new Error('Database connection failed. Check permissions and path: ' + DB_PATH);
    }
    
    console.log('Initializing database tables...');
    try {
      initializeDatabase(db);
      console.log('Database tables initialized successfully');
    } catch (dbErr) {
      console.error('Error initializing database tables:', dbErr);
      console.log('Will attempt to continue startup despite database initialization error');
    }
    
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
    if (settings && settings.ssl_enabled && settings.ssl_cert_path && settings.ssl_key_path) {
      try {
        // Resolve paths (SSL paths are stored as /ssl/file.crt, but actual path is relative to project root)
        let certPath, keyPath;
        
        // Handle both absolute and relative paths
        if (settings.ssl_cert_path.startsWith('/')) {
          certPath = path.join(__dirname, '..', settings.ssl_cert_path);
        } else {
          certPath = settings.ssl_cert_path;
        }
        
        if (settings.ssl_key_path.startsWith('/')) {
          keyPath = path.join(__dirname, '..', settings.ssl_key_path);
        } else {
          keyPath = settings.ssl_key_path;
        }
        
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
      console.log('WebSocket server initialized');
    } catch (err) {
      console.error('Failed to initialize WebSocket server:', err);
      console.log('Continuing without WebSocket support');
    }

    // Initialize storage
    try {
      console.log('Initializing storage...');
      const storagePath = await initializeStorage(app.get('db'));
      console.log(`Storage initialized at: ${storagePath}`);
    } catch (err) {
      console.error('Storage initialization error:', err);
      console.log('Continuing with default storage settings');
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
    
    // Special API status check endpoint for health monitoring
    app.get('/api/status', (req, res) => {
      res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        version: '1.2.1',
        message: 'VisionHub One Sentinel API is operational'
      });
    });
    
    // Start camera monitoring
    try {
      console.log('Starting camera monitoring...');
      const monitoringInterval = startMonitoring(app.get('db'));
      console.log('Camera monitoring started');
    } catch (err) {
      console.error('Failed to start camera monitoring:', err);
      console.log('Continuing without camera monitoring');
    }

    // Catch-all route for SPA
    app.get('*', (req, res) => {
      const indexPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`Error: index.html not found at ${indexPath}`);
        res.status(200).send(`
          <html>
            <head><title>VisionHub One Sentinel</title></head>
            <body>
              <h1>VisionHub One Sentinel</h1>
              <p>API server is running, but the frontend is not available.</p>
              <p>API endpoints are available at /api/*</p>
            </body>
          </html>
        `);
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
