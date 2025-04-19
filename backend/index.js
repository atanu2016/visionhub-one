
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
const DB_PATH = process.env.DB_PATH || '/var/visionhub/db/users.db';

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
app.use(express.static(path.join(__dirname, '../dist')));
app.use('/backups', express.static(path.join(__dirname, '../backups')));
app.use('/recordings', express.static(path.join(__dirname, '../recordings')));

// Create HTTP or HTTPS server based on settings
let server;

// Initialize database middleware
app.use(databaseMiddleware(DB_PATH));

// Store the database path for later reference
app.set('dbPath', DB_PATH);

// Function to initialize the server
async function initializeServer() {
  try {
    // Check if SSL is enabled
    const settings = await new Promise((resolve, reject) => {
      app.get('db').get('SELECT ssl_enabled, ssl_cert_path, ssl_key_path FROM settings WHERE id = 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row || { ssl_enabled: 0 });
      });
    });
    
    // Initialize user auth tables
    const db = app.get('db');
    initializeDatabase(db);
    
    // Execute auth migration
    const authMigration = fs.readFileSync(path.join(__dirname, './migrations/auth.sql'), 'utf8');
    const statements = authMigration.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await new Promise((resolve, reject) => {
          db.run(statement, function(err) {
            if (err) {
              console.error('Error executing auth migration:', err);
              console.error('Statement:', statement);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    }
    
    // Check if SSL is enabled and certificates exist
    if (settings.ssl_enabled && settings.ssl_cert_path && settings.ssl_key_path) {
      try {
        // Resolve paths (SSL paths are stored as /ssl/file.crt, but actual path is relative to project root)
        const certPath = path.join(__dirname, '..', settings.ssl_cert_path);
        const keyPath = path.join(__dirname, '..', settings.ssl_key_path);
        
        // Check if files exist
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
          const options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
          };
          
          server = https.createServer(options, app);
          console.log('HTTPS server created with SSL certificates');
        } else {
          console.warn('SSL certificates not found, falling back to HTTP');
          server = http.createServer(app);
        }
      } catch (error) {
        console.error('Error creating HTTPS server:', error);
        console.warn('Falling back to HTTP server');
        server = http.createServer(app);
      }
    } else {
      // Create standard HTTP server
      server = http.createServer(app);
    }

    // Initialize WebSocket server
    initWebSocketServer(server);

    // Initialize storage
    initializeStorage(app.get('db')).then(storagePath => {
      console.log(`Storage initialized at: ${storagePath}`);
    }).catch(err => {
      console.error('Storage initialization error:', err);
    });

    // API Routes
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
    const monitoringInterval = startMonitoring(app.get('db'));

    // Catch-all route for SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });

    // Start server
    server.listen(PORT, () => {
      const protocol = server instanceof https.Server ? 'HTTPS' : 'HTTP';
      console.log(`VisionHub One Sentinel backend running on ${protocol} port ${PORT}`);
      
      // Log system start event
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
  
  // Stop all recordings
  stopAllRecordings(app.get('db'));
  
  // Close database
  app.get('db').close();
  
  process.exit(0);
}

// Initialize and start server
initializeServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle graceful shutdown signals
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
