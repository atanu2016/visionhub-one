
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

// Import middleware
const databaseMiddleware = require('./middleware/databaseMiddleware');

// Import routes
const cameraRoutes = require('./routes/cameraRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// Import utils
const { initWebSocketServer } = require('./utils/websocketManager');
const { stopAllRecordings } = require('./utils/recordingEngine');
const { startMonitoring } = require('./utils/cameraMonitor');
const { initializeStorage } = require('./utils/storageManager');

// Configure environment variables
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../db/visionhub.db');

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Initialize database middleware
app.use(databaseMiddleware(DB_PATH));

// Initialize storage
initializeStorage(app.get('db')).then(storagePath => {
  console.log(`Storage initialized at: ${storagePath}`);
}).catch(err => {
  console.error('Storage initialization error:', err);
});

// API Routes
app.use('/api/cameras', cameraRoutes);
app.use('/api/settings', settingsRoutes);

// Start camera monitoring
const monitoringInterval = startMonitoring(app.get('db'));

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`VisionHub One Sentinel backend running on port ${PORT}`);
  
  // Log system start event
  const eventId = uuidv4();
  const eventSql = `INSERT INTO events (id, timestamp, event_type, message, severity) 
                    VALUES (?, ?, ?, ?, ?)`;
  app.get('db').run(eventSql, [
    eventId,
    new Date().toISOString(),
    'system_started',
    'VisionHub One Sentinel system started',
    'info'
  ]);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  
  // Stop all recordings
  stopAllRecordings(app.get('db'));
  
  // Close database
  app.get('db').close();
  
  process.exit(0);
});

