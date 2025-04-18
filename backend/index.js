
/*
 * VisionHub One Sentinel Backend
 * This is a placeholder file for the backend implementation.
 * In a real application, this would contain the full Express.js server,
 * ONVIF implementation, RTMP handling, etc.
 */

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure environment variables
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../db/visionhub.db');
const STORAGE_PATH = process.env.STORAGE_PATH || '/var/visionhub/recordings';

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../dist')));

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

// API Routes

// GET /api/cameras - List all cameras
app.get('/api/cameras', (req, res) => {
  db.all('SELECT * FROM cameras', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
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
    
    res.json({
      ...camera,
      motion_detection: !!camera.motion_detection,
      is_recording: !!camera.is_recording
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
    res.json(rows);
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
    
    const isRecording = record ? 1 : 0;
    
    // Update recording status
    db.run('UPDATE cameras SET is_recording = ?, last_updated = ? WHERE id = ?', 
      [isRecording, new Date().toISOString(), id], 
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Log event and create recording entry if starting
        if (record) {
          const recordingId = uuidv4();
          const startTime = new Date().toISOString();
          const filePath = `${STORAGE_PATH}/${camera.name.replace(/\s+/g, '_')}_${startTime.replace(/[:.]/g, '_')}.mp4`;
          
          // Create recording entry
          const recSql = `INSERT INTO recordings 
                          (id, camera_id, camera_name, start_time, trigger_type, file_path) 
                          VALUES (?, ?, ?, ?, ?, ?)`;
          db.run(recSql, [
            recordingId,
            id,
            camera.name,
            startTime,
            'manual',
            filePath
          ]);
          
          // Log event
          const eventId = uuidv4();
          const eventSql = `INSERT INTO events (id, timestamp, event_type, message, camera_id, severity) 
                            VALUES (?, ?, ?, ?, ?, ?)`;
          db.run(eventSql, [
            eventId,
            startTime,
            'recording_started',
            `Manual recording started on ${camera.name}`,
            id,
            'info'
          ]);
          
          // In a real application, we would start FFMPEG here
          console.log(`[MOCK] Starting recording for ${camera.name} to ${filePath}`);
          
          res.json({ 
            success: true, 
            recording: true,
            recordingId
          });
        } else {
          // Find current active recording for this camera
          db.get('SELECT * FROM recordings WHERE camera_id = ? AND end_time IS NULL', [id], (err, recording) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            if (recording) {
              const endTime = new Date().toISOString();
              const startTime = new Date(recording.start_time);
              const duration = Math.floor((new Date(endTime) - startTime) / 1000); // Duration in seconds
              
              // Update recording with end time and duration
              db.run('UPDATE recordings SET end_time = ?, duration = ? WHERE id = ?',
                [endTime, duration, recording.id]);
              
              // Log event
              const eventId = uuidv4();
              const eventSql = `INSERT INTO events (id, timestamp, event_type, message, camera_id, severity) 
                                VALUES (?, ?, ?, ?, ?, ?)`;
              db.run(eventSql, [
                eventId,
                endTime,
                'recording_stopped',
                `Recording stopped on ${camera.name}`,
                id,
                'info'
              ]);
              
              // In a real application, we would stop FFMPEG here
              console.log(`[MOCK] Stopping recording for ${camera.name}`);
            }
            
            res.json({ 
              success: true, 
              recording: false 
            });
          });
        }
      }
    );
  });
});

// POST /api/onvif/discover - Discover ONVIF cameras
app.post('/api/onvif/discover', (req, res) => {
  const { subnet } = req.body;
  
  // In a real application, this would use the ONVIF protocol to discover cameras
  // For now, we'll just return some mock data
  console.log(`[MOCK] Discovering ONVIF cameras on subnet ${subnet}`);
  
  setTimeout(() => {
    res.json([
      {
        name: "ONVIF Camera 1",
        ipAddress: "192.168.1.100",
        port: 80,
        manufacturer: "Hikvision",
        model: "DS-2CD2185FWD-I"
      },
      {
        name: "ONVIF Camera 2",
        ipAddress: "192.168.1.101",
        port: 80,
        manufacturer: "Dahua",
        model: "IPC-HDW5231R-ZE"
      },
      {
        name: "ONVIF Camera 3",
        ipAddress: "192.168.1.102",
        port: 80,
        manufacturer: "Axis",
        model: "P3245-LVE"
      }
    ]);
  }, 2000); // Simulate network delay
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
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
  db.close();
  process.exit(0);
});
