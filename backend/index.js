
/*
 * VisionHub One Sentinel Backend
 * This implements a camera management system with ONVIF discovery and RTMP recording.
 */

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

// Import utils
const { discoverCameras } = require('./utils/onvifDiscovery');
const { initWebSocketServer, broadcastEvent } = require('./utils/websocketManager');
const { startRecording, stopRecording, isRecording, stopAllRecordings } = require('./utils/recordingEngine');
const { monitorCamera, stopMonitoring, startMonitoring } = require('./utils/cameraMonitor');

// Configure environment variables
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../db/visionhub.db');
const STORAGE_PATH = process.env.STORAGE_PATH || '/var/visionhub/recordings';

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Initialize SQLite database connection
let db;
try {
  db = new sqlite3.Database(DB_PATH);
  console.log(`Connected to SQLite database at ${DB_PATH}`);
} catch (err) {
  console.error('Database connection error:', err);
  process.exit(1);
}

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_PATH)) {
  try {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
    console.log(`Created storage directory at ${STORAGE_PATH}`);
  } catch (err) {
    console.error('Error creating storage directory:', err);
  }
}

// Start camera monitoring
const monitoringInterval = startMonitoring(db);

// API Routes

// GET /api/cameras - List all cameras
app.get('/api/cameras', (req, res) => {
  db.all('SELECT * FROM cameras', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Transform database rows to match frontend types
    const cameras = rows.map(row => ({
      id: row.id,
      name: row.name,
      ipAddress: row.ip_address,
      streamUrl: row.stream_url,
      onvifPort: row.onvif_port,
      username: row.username,
      password: row.password,
      status: row.status,
      motionDetection: !!row.motion_detection,
      motionSensitivity: row.motion_sensitivity,
      location: row.location,
      manufacturer: row.manufacturer,
      model: row.model,
      lastUpdated: row.last_updated,
      isRecording: !!row.is_recording
    }));
    
    res.json(cameras);
  });
});

// POST /api/cameras - Add a new camera
app.post('/api/cameras', (req, res) => {
  const { name, ipAddress, streamUrl, onvifPort, username, password, motionDetection, motionSensitivity, location } = req.body;
  
  const camera = {
    id: uuidv4(),
    name,
    ip_address: ipAddress,
    stream_url: streamUrl,
    onvif_port: onvifPort,
    username,
    password,
    status: 'idle',
    motion_detection: motionDetection ? 1 : 0,
    motion_sensitivity: motionSensitivity || 50,
    location,
    last_updated: new Date().toISOString(),
    is_recording: 0
  };
  
  const sql = `INSERT INTO cameras 
               (id, name, ip_address, stream_url, onvif_port, username, password, status, motion_detection, motion_sensitivity, location, last_updated, is_recording)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
               
  db.run(sql, [
    camera.id, camera.name, camera.ip_address, camera.stream_url, camera.onvif_port, 
    camera.username, camera.password, camera.status, camera.motion_detection, 
    camera.motion_sensitivity, camera.location, camera.last_updated, camera.is_recording
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Log event
    const eventId = uuidv4();
    const eventSql = `INSERT INTO events (id, timestamp, event_type, message, camera_id, severity) 
                      VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(eventSql, [
      eventId,
      new Date().toISOString(),
      'camera_added',
      `Camera "${name}" added to system`,
      camera.id,
      'info'
    ]);
    
    // Start monitoring the new camera
    monitorCamera({
      id: camera.id,
      name: camera.name,
      ipAddress: camera.ip_address,
      streamUrl: camera.stream_url,
      isRecording: false
    }, db);
    
    // Broadcast event
    broadcastEvent({
      id: eventId,
      timestamp: new Date().toISOString(),
      eventType: 'camera_added',
      message: `Camera "${name}" added to system`,
      cameraId: camera.id,
      severity: 'info'
    });
    
    res.json({
      id: camera.id,
      name: camera.name,
      ipAddress: camera.ip_address,
      streamUrl: camera.stream_url,
      onvifPort: camera.onvif_port,
      username: camera.username,
      password: camera.password,
      status: camera.status,
      motionDetection: !!camera.motion_detection,
      motionSensitivity: camera.motion_sensitivity,
      location: camera.location,
      lastUpdated: camera.last_updated,
      isRecording: !!camera.is_recording
    });
  });
});

// GET /api/recordings - List recordings
app.get('/api/recordings', (req, res) => {
  // Optional camera_id query parameter
  const cameraId = req.query.camera_id;
  let sql = 'SELECT * FROM recordings';
  let params = [];
  
  if (cameraId) {
    sql += ' WHERE camera_id = ?';
    params.push(cameraId);
  }
  
  sql += ' ORDER BY start_time DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Convert rows to match frontend types
    const recordings = rows.map(row => ({
      id: row.id,
      cameraId: row.camera_id,
      cameraName: row.camera_name,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      triggerType: row.trigger_type,
      fileSize: row.file_size,
      filePath: row.file_path,
      thumbnail: row.thumbnail
    }));
    
    res.json(recordings);
  });
});

// GET /api/events - List events
app.get('/api/events', (req, res) => {
  // Optional camera_id query parameter
  const cameraId = req.query.camera_id;
  let sql = 'SELECT * FROM events';
  let params = [];
  
  if (cameraId) {
    sql += ' WHERE camera_id = ?';
    params.push(cameraId);
  }
  
  sql += ' ORDER BY timestamp DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET /api/settings - Get system settings
app.get('/api/settings', (req, res) => {
  db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row);
  });
});

// PUT /api/settings - Update system settings
app.put('/api/settings', (req, res) => {
  const { 
    storage_location, 
    network_subnet, 
    recording_format, 
    recording_quality, 
    motion_detection_enabled, 
    alert_email,
    alert_webhook_url, 
    retention_days 
  } = req.body;
  
  const sql = `UPDATE settings SET 
               storage_location = ?,
               network_subnet = ?,
               recording_format = ?,
               recording_quality = ?,
               motion_detection_enabled = ?,
               alert_email = ?,
               alert_webhook_url = ?,
               retention_days = ?
               WHERE id = 1`;
               
  db.run(sql, [
    storage_location,
    network_subnet,
    recording_format,
    recording_quality,
    motion_detection_enabled ? 1 : 0,
    alert_email,
    alert_webhook_url,
    retention_days
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Log event
    const eventId = uuidv4();
    const eventSql = `INSERT INTO events (id, timestamp, event_type, message, severity) 
                      VALUES (?, ?, ?, ?, ?)`;
    db.run(eventSql, [
      eventId,
      new Date().toISOString(),
      'system_updated',
      'System settings updated',
      'info'
    ]);
    
    res.json({ 
      storage_location, 
      network_subnet, 
      recording_format, 
      recording_quality, 
      motion_detection_enabled: !!motion_detection_enabled, 
      alert_email,
      alert_webhook_url, 
      retention_days 
    });
  });
});

// PUT /api/cameras/:id - Update a camera
app.put('/api/cameras/:id', (req, res) => {
  const { id } = req.params;
  const { name, ipAddress, streamUrl, onvifPort, username, password, motionDetection, motionSensitivity, location, status } = req.body;
  
  const sql = `UPDATE cameras SET 
               name = ?, 
               ip_address = ?,
               stream_url = ?,
               onvif_port = ?,
               username = ?,
               password = ?,
               status = ?,
               motion_detection = ?,
               motion_sensitivity = ?,
               location = ?,
               last_updated = ?
               WHERE id = ?`;
               
  db.run(sql, [
    name,
    ipAddress,
    streamUrl,
    onvifPort,
    username,
    password,
    status || 'idle',
    motionDetection ? 1 : 0,
    motionSensitivity,
    location,
    new Date().toISOString(),
    id
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    // Log event
    const eventId = uuidv4();
    const eventSql = `INSERT INTO events (id, timestamp, event_type, message, camera_id, severity) 
                      VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(eventSql, [
      eventId,
      new Date().toISOString(),
      'camera_updated',
      `Camera "${name}" settings updated`,
      id,
      'info'
    ]);
    
    res.json({
      id,
      name,
      ipAddress,
      streamUrl,
      onvifPort,
      username,
      password,
      status: status || 'idle',
      motionDetection: !!motionDetection,
      motionSensitivity,
      location,
      last_updated: new Date().toISOString()
    });
  });
});

// DELETE /api/cameras/:id - Delete a camera
app.delete('/api/cameras/:id', (req, res) => {
  const { id } = req.params;
  
  // First get the camera name for the event log
  db.get('SELECT name FROM cameras WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    const cameraName = row.name;
    
    // Stop recording if active
    if (isRecording(id)) {
      stopRecording(id, db);
    }
    
    // Stop monitoring
    stopMonitoring(id);
    
    // Now delete the camera
    db.run('DELETE FROM cameras WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Log event
      const eventId = uuidv4();
      const eventSql = `INSERT INTO events (id, timestamp, event_type, message, severity) 
                        VALUES (?, ?, ?, ?, ?)`;
      db.run(eventSql, [
        eventId,
        new Date().toISOString(),
        'camera_removed',
        `Camera "${cameraName}" removed from system`,
        'info'
      ]);
      
      // Broadcast event
      broadcastEvent({
        id: eventId,
        timestamp: new Date().toISOString(),
        eventType: 'camera_removed',
        message: `Camera "${cameraName}" removed from system`,
        severity: 'info'
      });
      
      res.json({ success: true });
    });
  });
});

// PUT /api/cameras/:id/record - Start/stop recording
app.put('/api/cameras/:id/record', (req, res) => {
  const { id } = req.params;
  const { record } = req.body;
  
  // First get the camera details
  db.get('SELECT * FROM cameras WHERE id = ?', [id], (err, camera) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    // Convert database row to camera object
    const cameraObj = {
      id: camera.id,
      name: camera.name,
      ipAddress: camera.ip_address,
      streamUrl: camera.stream_url,
      onvifPort: camera.onvif_port,
      username: camera.username,
      password: camera.password,
      status: camera.status,
      motionDetection: !!camera.motion_detection,
      motionSensitivity: camera.motion_sensitivity,
      location: camera.location,
      manufacturer: camera.manufacturer,
      model: camera.model
    };
    
    if (record) {
      // Start recording
      const result = startRecording(cameraObj, db, STORAGE_PATH);
      res.json(result);
    } else {
      // Stop recording
      const result = stopRecording(id, db);
      res.json(result);
    }
  });
});

// POST /api/onvif/discover - Discover ONVIF cameras
app.post('/api/onvif/discover', async (req, res) => {
  const { subnet } = req.body;
  
  try {
    console.log(`Starting ONVIF camera discovery on subnet: ${subnet || 'default'}`);
    
    // Log event
    const eventId = uuidv4();
    db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, new Date().toISOString(), 'discovery_started', 
       `ONVIF camera discovery started on subnet ${subnet || 'default'}`, 'info']
    );
    
    // Start discovery
    const discoveredCameras = await discoverCameras(subnet || '0.0.0.0/24');
    
    // Log discovery completion
    const completionEventId = uuidv4();
    db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [completionEventId, new Date().toISOString(), 'discovery_completed', 
       `ONVIF discovery completed. Found ${discoveredCameras.length} cameras.`, 'info']
    );
    
    res.json(discoveredCameras);
  } catch (error) {
    console.error('Error during camera discovery:', error);
    
    const errorEventId = uuidv4();
    db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [errorEventId, new Date().toISOString(), 'discovery_error', 
       `Error during camera discovery: ${error.message}`, 'error']
    );
    
    res.status(500).json({ error: error.message });
  }
});

// NEW: POST /api/onvif/probe - Test connection to a specific camera
app.post('/api/onvif/probe', async (req, res) => {
  const { ipAddress, port, username, password } = req.body;
  
  try {
    const onvif = require('onvif');
    
    // Create new cam instance
    const cam = new onvif.Cam({
      hostname: ipAddress,
      port: port || 80,
      username: username || '',
      password: password || ''
    });
    
    // Test connection with timeout
    const deviceInfo = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
      
      cam.getDeviceInformation((err, info) => {
        clearTimeout(timeout);
        if (err) {
          reject(err);
          return;
        }
        resolve(info);
      });
    });
    
    // Get stream URI
    const streamUri = await new Promise((resolve, reject) => {
      cam.getStreamUri({ protocol: 'RTSP' }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stream);
      });
    });
    
    res.json({
      success: true,
      deviceInfo,
      streamUrl: streamUri.uri,
      capabilities: {
        hasRtsp: !!streamUri.uri,
        hasPtz: !!cam.capabilities?.PTZ
      }
    });
  } catch (error) {
    console.error('Error connecting to camera:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

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
  db.run(eventSql, [
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
  stopAllRecordings(db);
  
  // Close database
  db.close();
  
  process.exit(0);
});
