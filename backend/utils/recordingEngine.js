
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { broadcastCameraStatus, broadcastEvent } = require('./websocketManager');
const { getStoragePath } = require('./storageManager');

// Map of active recording processes: cameraId -> { process, filePath, startTime }
const activeRecordings = new Map();

/**
 * Start recording a camera stream
 * @param {object} camera - Camera object with all required properties
 * @param {object} db - SQLite database connection
 * @returns {object} Recording information
 */
function startRecording(camera, db) {
  if (activeRecordings.has(camera.id)) {
    console.log(`Recording already active for camera ${camera.name}`);
    return { success: false, error: 'Recording already active' };
  }
  
  // Get storage path (either local or NAS based on configuration)
  const storagePath = getStoragePath();
  
  // Ensure storage directory exists
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  
  const cameraDir = path.join(storagePath, camera.id);
  if (!fs.existsSync(cameraDir)) {
    fs.mkdirSync(cameraDir, { recursive: true });
  }
  
  // Generate recording ID and file path
  const recordingId = uuidv4();
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const fileName = `${camera.name.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.mp4`;
  const filePath = path.join(cameraDir, fileName);
  const thumbnailPath = path.join(cameraDir, `${path.basename(fileName, '.mp4')}_thumb.jpg`);
  
  try {
    console.log(`Starting recording for camera ${camera.name} to ${filePath}`);
    
    let streamUrl = camera.streamUrl;
    
    // Default to rtsp if protocol not specified
    if (!streamUrl.startsWith('rtsp://') && !streamUrl.startsWith('rtmp://')) {
      streamUrl = `rtsp://${streamUrl}`;
    }
    
    // Build command with authentication if provided
    let inputOptions = [];
    
    if (camera.username && camera.password) {
      inputOptions.push(
        '-rtsp_transport', 'tcp',
        '-i', `${streamUrl.replace('://', `://${camera.username}:${camera.password}@`)}`
      );
    } else {
      inputOptions.push(
        '-rtsp_transport', 'tcp',
        '-i', streamUrl
      );
    }
    
    // Motion detection parameters if enabled
    const motionDetectionParams = camera.motionDetection ? [
      '-vf', `select='gte(scene,${camera.motionSensitivity/100})'`,
      '-vsync', 'vfr'
    ] : [];
    
    // Add sound if available
    const audioParams = ['-c:a', 'aac'];
    
    // Start ffmpeg process
    const process = spawn('ffmpeg', [
      '-y',
      ...inputOptions,
      '-c:v', 'copy',
      ...audioParams,
      '-metadata', `title=${camera.name}`,
      '-metadata', `comment=Recorded by VisionHub One Sentinel`,
      filePath
    ]);
    
    process.stderr.on('data', (data) => {
      // FFMPEG outputs to stderr by default
      console.log(`FFMPEG (${camera.name}): ${data.toString()}`);
    });
    
    process.on('error', (error) => {
      console.error(`Recording error for camera ${camera.name}:`, error);
      stopRecording(camera.id, db);
      
      // Log event
      const eventId = uuidv4();
      db.run(
        `INSERT INTO events (id, timestamp, event_type, message, camera_id, severity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [eventId, new Date().toISOString(), 'recording_error', 
         `Recording error on camera ${camera.name}: ${error.message}`, 
         camera.id, 'error']
      );
      
      // Broadcast error
      broadcastEvent({
        id: eventId,
        timestamp: new Date().toISOString(),
        eventType: 'recording_error',
        message: `Recording error on camera ${camera.name}`,
        cameraId: camera.id,
        severity: 'error'
      });
    });
    
    process.on('exit', (code, signal) => {
      console.log(`Recording process exited for ${camera.name} with code ${code} and signal ${signal}`);
      
      if (activeRecordings.has(camera.id)) {
        const recording = activeRecordings.get(camera.id);
        
        // Only finish recording if it wasn't stopped intentionally
        if (recording.process === process) {
          finishRecording(camera.id, db);
        }
      }
    });
    
    // Generate thumbnail after 5 seconds
    setTimeout(() => {
      generateThumbnail(streamUrl, thumbnailPath, camera);
    }, 5000);
    
    // Create recording entry
    const startTime = new Date().toISOString();
    
    const recording = {
      id: recordingId,
      process,
      filePath,
      thumbnailPath,
      startTime
    };
    
    activeRecordings.set(camera.id, recording);
    
    // Update database
    db.run(
      `INSERT INTO recordings
       (id, camera_id, camera_name, start_time, trigger_type, file_path, thumbnail)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [recordingId, camera.id, camera.name, startTime, 'manual', filePath, thumbnailPath]
    );
    
    // Update camera recording status
    db.run(
      `UPDATE cameras SET is_recording = 1, last_updated = ? WHERE id = ?`,
      [new Date().toISOString(), camera.id]
    );
    
    // Log event
    const eventId = uuidv4();
    db.run(
      `INSERT INTO events (id, timestamp, event_type, message, camera_id, severity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [eventId, startTime, 'recording_started', 
       `Recording started on camera ${camera.name}`, 
       camera.id, 'info']
    );
    
    // Broadcast status update
    broadcastCameraStatus(camera.id, 'recording', true);
    
    return { 
      success: true, 
      recording: true,
      recordingId,
      filePath
    };
    
  } catch (error) {
    console.error(`Failed to start recording for ${camera.name}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a thumbnail from the camera stream
 */
function generateThumbnail(streamUrl, thumbnailPath, camera) {
  try {
    let inputOptions = [];
    
    if (camera.username && camera.password) {
      inputOptions.push(
        '-rtsp_transport', 'tcp',
        '-i', `${streamUrl.replace('://', `://${camera.username}:${camera.password}@`)}`
      );
    } else {
      inputOptions.push(
        '-rtsp_transport', 'tcp',
        '-i', streamUrl
      );
    }
    
    const thumbProcess = spawn('ffmpeg', [
      ...inputOptions,
      '-vframes', '1',
      '-q:v', '2',
      thumbnailPath
    ]);
    
    thumbProcess.stderr.on('data', (data) => {
      // FFMPEG logs to stderr
      console.log(`Thumbnail FFMPEG (${camera.name}): ${data.toString()}`);
    });
    
    thumbProcess.on('exit', (code) => {
      if (code === 0) {
        console.log(`Generated thumbnail for ${camera.name}`);
      } else {
        console.error(`Failed to generate thumbnail for ${camera.name}, code: ${code}`);
      }
    });
  } catch (error) {
    console.error(`Error generating thumbnail for ${camera.name}:`, error);
  }
}

/**
 * Stop an active recording
 * @param {string} cameraId - ID of the camera to stop recording
 * @param {object} db - SQLite database connection
 * @returns {object} Status of the operation
 */
function stopRecording(cameraId, db) {
  if (!activeRecordings.has(cameraId)) {
    return { success: false, error: 'No active recording found' };
  }
  
  const recording = activeRecordings.get(cameraId);
  
  try {
    // Kill the ffmpeg process gracefully
    recording.process.kill('SIGTERM');
    
    // Finish the recording
    finishRecording(cameraId, db);
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to stop recording for camera ${cameraId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Finish a recording and update database
 * @param {string} cameraId - ID of the camera
 * @param {object} db - SQLite database connection
 */
function finishRecording(cameraId, db) {
  if (!activeRecordings.has(cameraId)) {
    return;
  }
  
  const recording = activeRecordings.get(cameraId);
  activeRecordings.delete(cameraId);
  
  try {
    // Get recording info
    const endTime = new Date().toISOString();
    const startTime = new Date(recording.startTime);
    const duration = Math.floor((new Date(endTime) - startTime) / 1000); // Duration in seconds
    
    // Get file size if file exists
    let fileSize = 0;
    if (fs.existsSync(recording.filePath)) {
      const stats = fs.statSync(recording.filePath);
      fileSize = stats.size;
    }
    
    // Update database
    db.run(
      `UPDATE recordings SET 
       end_time = ?, 
       duration = ?, 
       file_size = ?
       WHERE id = ?`,
      [endTime, duration, fileSize, recording.id]
    );
    
    // Update camera recording status
    db.run(
      `UPDATE cameras SET is_recording = 0, last_updated = ? WHERE id = ?`,
      [endTime, cameraId]
    );
    
    // Get camera name
    db.get('SELECT name FROM cameras WHERE id = ?', [cameraId], (err, camera) => {
      if (err || !camera) {
        console.error('Error getting camera name:', err || 'Camera not found');
        return;
      }
      
      // Log event
      const eventId = uuidv4();
      db.run(
        `INSERT INTO events (id, timestamp, event_type, message, camera_id, severity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [eventId, endTime, 'recording_stopped', 
         `Recording stopped on camera ${camera.name}`, 
         cameraId, 'info']
      );
      
      // Broadcast status update
      broadcastCameraStatus(cameraId, 'active', false);
      
      // Broadcast event
      broadcastEvent({
        id: eventId,
        timestamp: endTime,
        eventType: 'recording_stopped',
        message: `Recording stopped on camera ${camera.name}`,
        cameraId,
        severity: 'info'
      });
    });
  } catch (error) {
    console.error(`Error finalizing recording for camera ${cameraId}:`, error);
  }
}

/**
 * Check if a camera is currently recording
 * @param {string} cameraId - Camera ID
 * @returns {boolean} - True if recording
 */
function isRecording(cameraId) {
  return activeRecordings.has(cameraId);
}

/**
 * Stop all active recordings
 * @param {object} db - SQLite database connection
 */
function stopAllRecordings(db) {
  console.log(`Stopping all ${activeRecordings.size} active recordings`);
  
  for (const cameraId of activeRecordings.keys()) {
    stopRecording(cameraId, db);
  }
}

module.exports = {
  startRecording,
  stopRecording,
  isRecording,
  stopAllRecordings
};
