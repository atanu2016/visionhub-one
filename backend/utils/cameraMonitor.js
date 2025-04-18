
const { exec } = require('child_process');
const { broadcastCameraStatus, broadcastEvent } = require('./websocketManager');
const { v4: uuidv4 } = require('uuid');

// Map to track cameras: cameraId -> { lastSeen, status }
const monitoredCameras = new Map();
// Timeout in ms to consider a camera offline
const OFFLINE_TIMEOUT = 60000; // 1 minute

/**
 * Start monitoring a camera
 * @param {object} camera - Camera object 
 * @param {object} db - Database connection
 */
function monitorCamera(camera, db) {
  if (monitoredCameras.has(camera.id)) {
    // Update existing monitored camera info
    const existing = monitoredCameras.get(camera.id);
    existing.name = camera.name;
    existing.ipAddress = camera.ipAddress;
    existing.streamUrl = camera.streamUrl;
    existing.isRecording = camera.isRecording;
  } else {
    // Add new camera to monitoring
    monitoredCameras.set(camera.id, {
      id: camera.id,
      name: camera.name,
      ipAddress: camera.ipAddress,
      streamUrl: camera.streamUrl,
      lastSeen: new Date(),
      status: 'unknown',
      isRecording: camera.isRecording
    });
    
    console.log(`Started monitoring camera: ${camera.name} (${camera.ipAddress})`);
  }
}

/**
 * Stop monitoring a camera
 * @param {string} cameraId - Camera ID
 */
function stopMonitoring(cameraId) {
  if (monitoredCameras.has(cameraId)) {
    monitoredCameras.delete(cameraId);
    console.log(`Stopped monitoring camera: ${cameraId}`);
  }
}

/**
 * Check if a host is reachable via ping
 * @param {string} host - Hostname or IP address
 * @returns {Promise<boolean>} - True if host is reachable
 */
async function isHostReachable(host) {
  return new Promise((resolve) => {
    const pingCmd = process.platform === 'win32' ? 
      `ping -n 1 -w 1000 ${host}` : 
      `ping -c 1 -W 1 ${host}`;
    
    exec(pingCmd, (error) => {
      resolve(!error);
    });
  });
}

/**
 * Update camera status in database
 * @param {string} cameraId - Camera ID
 * @param {string} status - New status
 * @param {object} db - Database connection
 */
function updateCameraStatus(cameraId, status, db) {
  const now = new Date().toISOString();
  
  // Update database
  db.run(
    'UPDATE cameras SET status = ?, last_updated = ? WHERE id = ?',
    [status, now, cameraId],
    (err) => {
      if (err) {
        console.error(`Failed to update camera ${cameraId} status:`, err);
      }
    }
  );
  
  // Get camera info
  if (monitoredCameras.has(cameraId)) {
    const camera = monitoredCameras.get(cameraId);
    
    // Only log an event if status changed
    if (camera.status !== status) {
      const prevStatus = camera.status;
      camera.status = status;
      
      // Log event if status changed from active to offline or vice versa
      if ((prevStatus === 'active' && status === 'offline') ||
          (prevStatus === 'offline' && status === 'active') ||
          prevStatus === 'unknown') {
        
        let eventType, message, severity;
        if (status === 'active') {
          eventType = 'camera_online';
          message = `Camera ${camera.name} is now online`;
          severity = 'info';
        } else {
          eventType = 'camera_offline';
          message = `Camera ${camera.name} is offline`;
          severity = 'warning';
        }
        
        const eventId = uuidv4();
        db.run(
          `INSERT INTO events (id, timestamp, event_type, message, camera_id, severity)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [eventId, now, eventType, message, cameraId, severity]
        );
        
        // Broadcast event
        broadcastEvent({
          id: eventId,
          timestamp: now,
          eventType,
          message,
          cameraId,
          severity
        });
      }
      
      // Broadcast status update
      broadcastCameraStatus(cameraId, status, camera.isRecording);
    }
  }
}

/**
 * Run a status check on all monitored cameras
 * @param {object} db - Database connection
 */
async function checkAllCamerasStatus(db) {
  for (const [cameraId, camera] of monitoredCameras.entries()) {
    try {
      // Check if the camera is reachable
      const isReachable = await isHostReachable(camera.ipAddress);
      
      if (isReachable) {
        // Camera is online
        camera.lastSeen = new Date();
        if (camera.status !== 'active') {
          updateCameraStatus(cameraId, 'active', db);
        }
      } else {
        // Check if camera has been unreachable for too long
        const timeSinceLastSeen = new Date() - camera.lastSeen;
        if (timeSinceLastSeen > OFFLINE_TIMEOUT && camera.status !== 'offline') {
          updateCameraStatus(cameraId, 'offline', db);
        }
      }
    } catch (err) {
      console.error(`Error checking camera ${cameraId} status:`, err);
    }
  }
}

/**
 * Start monitoring all cameras periodically
 * @param {object} db - Database connection
 * @param {number} interval - Check interval in milliseconds
 */
function startMonitoring(db, interval = 30000) {
  // Initial load of all cameras from database
  db.all('SELECT * FROM cameras', [], (err, rows) => {
    if (err) {
      console.error('Failed to load cameras for monitoring:', err);
      return;
    }
    
    // Add all cameras to monitoring
    rows.forEach(row => {
      monitorCamera({
        id: row.id,
        name: row.name,
        ipAddress: row.ip_address,
        streamUrl: row.stream_url,
        isRecording: !!row.is_recording
      }, db);
    });
    
    console.log(`Started monitoring ${rows.length} cameras`);
  });
  
  // Start periodic check
  const intervalId = setInterval(() => {
    checkAllCamerasStatus(db);
  }, interval);
  
  return intervalId;
}

module.exports = {
  monitorCamera,
  stopMonitoring,
  updateCameraStatus,
  checkAllCamerasStatus,
  startMonitoring
};
