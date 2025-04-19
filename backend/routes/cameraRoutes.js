const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { isRecording, startRecording, stopRecording } = require('../utils/recordingEngine');
const { monitorCamera, stopMonitoring } = require('../utils/cameraMonitor');
const { broadcastEvent } = require('../utils/websocketManager');
const { discoverCameras } = require('../utils/onvifDiscovery');

const router = express.Router();

// GET /api/cameras - List all cameras
router.get('/', (req, res) => {
  req.db.all('SELECT * FROM cameras', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
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
router.post('/', (req, res) => {
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
               
  req.db.run(sql, [
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
    req.db.run(eventSql, [
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
    }, req.db);
    
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

// PUT /api/cameras/:id - Update a camera
router.put('/:id', (req, res) => {
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
               
  req.db.run(sql, [
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
    req.db.run(eventSql, [
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
      lastUpdated: new Date().toISOString()
    });
  });
});

// DELETE /api/cameras/:id - Delete a camera
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // First get the camera name for the event log
  req.db.get('SELECT name FROM cameras WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    const cameraName = row.name;
    
    // Stop recording if active
    if (isRecording(id)) {
      stopRecording(id, req.db);
    }
    
    // Stop monitoring
    stopMonitoring(id);
    
    // Now delete the camera
    req.db.run('DELETE FROM cameras WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Log event
      const eventId = uuidv4();
      const eventSql = `INSERT INTO events (id, timestamp, event_type, message, severity) 
                        VALUES (?, ?, ?, ?, ?)`;
      req.db.run(eventSql, [
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
router.put('/:id/record', (req, res) => {
  const { id } = req.params;
  const { record } = req.body;
  
  // First get the camera details
  req.db.get('SELECT * FROM cameras WHERE id = ?', [id], (err, camera) => {
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
      const result = startRecording(cameraObj, req.db);
      res.json(result);
    } else {
      // Stop recording
      const result = stopRecording(id, req.db);
      res.json(result);
    }
  });
});

// POST /api/onvif/discover - Discover ONVIF cameras
router.post('/onvif/discover', async (req, res) => {
  const { subnet } = req.body;
  
  try {
    console.log(`Starting ONVIF camera discovery on subnet: ${subnet || 'default'}`);
    
    // Log event
    const eventId = uuidv4();
    req.db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, new Date().toISOString(), 'discovery_started', 
       `ONVIF camera discovery started on subnet ${subnet || 'default'}`, 'info']
    );
    
    // Start discovery
    const discoveredCameras = await discoverCameras(subnet || '0.0.0.0/24');
    
    // Log discovery completion
    const completionEventId = uuidv4();
    req.db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [completionEventId, new Date().toISOString(), 'discovery_completed', 
       `ONVIF discovery completed. Found ${discoveredCameras.length} cameras.`, 'info']
    );
    
    res.json(discoveredCameras);
  } catch (error) {
    console.error('Error during camera discovery:', error);
    
    const errorEventId = uuidv4();
    req.db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [errorEventId, new Date().toISOString(), 'discovery_error', 
       `Error during camera discovery: ${error.message}`, 'error']
    );
    
    res.status(500).json({ error: error.message });
  }
});

// POST /api/onvif/probe - Test connection to a specific camera
router.post('/onvif/probe', async (req, res) => {
  const { ipAddress, onvifPort, username, password } = req.body;
  
  if (!ipAddress) {
    return res.status(400).json({
      success: false,
      error: 'IP address is required'
    });
  }
  
  try {
    const onvif = require('onvif');
    
    // Create new cam instance
    const cam = new onvif.Cam({
      hostname: ipAddress,
      port: onvifPort || 80,
      username: username || '',
      password: password || ''
    });
    
    // Log event for probe attempt
    const eventId = require('uuid').v4();
    req.db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, new Date().toISOString(), 'camera_probe', 
       `ONVIF probe attempt for camera at ${ipAddress}:${onvifPort}`, 'info']
    );
    
    // Test connection with timeout
    const deviceInfo = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 10 seconds'));
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
    
    // Get capabilities
    const capabilities = await new Promise((resolve, reject) => {
      cam.getCapabilities((err, caps) => {
        if (err) {
          console.warn(`Warning: Could not get capabilities: ${err.message}`);
          resolve({});
          return;
        }
        resolve(caps);
      });
    });
    
    // Get stream URI
    let streamUri = null;
    try {
      streamUri = await new Promise((resolve, reject) => {
        const streamTimeout = setTimeout(() => {
          console.warn('Stream URI request timed out');
          resolve(null);
        }, 5000);
        
        cam.getStreamUri({ protocol: 'RTSP' }, (err, stream) => {
          clearTimeout(streamTimeout);
          if (err) {
            console.warn(`Warning: Could not get stream URI: ${err.message}`);
            resolve(null);
            return;
          }
          resolve(stream);
        });
      });
    } catch (streamError) {
      console.warn(`Warning: Error getting stream URI: ${streamError.message}`);
    }
    
    // Get profiles
    let profiles = [];
    try {
      profiles = await new Promise((resolve, reject) => {
        const profilesTimeout = setTimeout(() => {
          console.warn('Profiles request timed out');
          resolve([]);
        }, 5000);
        
        cam.getProfiles((err, profilesList) => {
          clearTimeout(profilesTimeout);
          if (err) {
            console.warn(`Warning: Could not get profiles: ${err.message}`);
            resolve([]);
            return;
          }
          resolve(profilesList);
        });
      });
    } catch (profilesError) {
      console.warn(`Warning: Error getting profiles: ${profilesError.message}`);
    }
    
    // Create response object with gathered information
    const response = {
      success: true,
      deviceInfo: deviceInfo || {},
      streamUrl: streamUri ? streamUri.uri : null,
      capabilities: {
        hasRtsp: !!streamUri?.uri,
        hasPtz: !!(capabilities.PTZ && capabilities.PTZ.XAddr),
        hasAnalytics: !!(capabilities.analytics && capabilities.analytics.XAddr),
        hasEvents: !!(capabilities.events && capabilities.events.XAddr),
        hasImaging: !!(capabilities.imaging && capabilities.imaging.XAddr)
      },
      profiles: profiles.map(p => ({
        name: p.name,
        token: p.$.token,
        resolution: p.videoEncoderConfiguration?.resolution ? 
          `${p.videoEncoderConfiguration.resolution.width}x${p.videoEncoderConfiguration.resolution.height}` : 
          'Unknown',
        type: p.videoEncoderConfiguration?.encoding || 'Unknown'
      }))
    };
    
    // If we have stream profiles but no URI, try to construct one
    if (!response.streamUrl && profiles.length > 0 && profiles[0].$.token) {
      // Attempt to construct a generic RTSP URL
      const authPart = username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
      response.streamUrl = `rtsp://${authPart}${ipAddress}:554/onvif/profile/${profiles[0].$.token}`;
      response.streamUrlGenerated = true;
    }
    
    // Log success
    req.db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [require('uuid').v4(), new Date().toISOString(), 'camera_probe_success', 
       `Successfully connected to ONVIF camera at ${ipAddress}:${onvifPort}`, 'info']
    );
    
    res.json(response);
  } catch (error) {
    console.error('Error connecting to camera:', error);
    
    // Log failure
    req.db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [require('uuid').v4(), new Date().toISOString(), 'camera_probe_failed', 
       `Failed to connect to ONVIF camera at ${ipAddress}:${onvifPort}: ${error.message}`, 'warning']
    );
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
