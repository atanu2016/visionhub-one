
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { broadcastEvent } = require('./websocketManager');
const { v4: uuidv4 } = require('uuid');

const execPromise = promisify(exec);

// Constants
const NAS_MOUNT_POINT = '/mnt/visionhub';
const LOCAL_STORAGE_PATH = '/var/visionhub/recordings';

// Current active storage path (can change based on NAS status)
let currentStoragePath = LOCAL_STORAGE_PATH;

/**
 * Get the current storage path
 * @returns {string} Current storage path
 */
function getStoragePath() {
  return currentStoragePath;
}

/**
 * Initialize storage settings
 * @param {object} db SQLite database connection
 */
async function initializeStorage(db) {
  try {
    // Get settings
    const settings = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    // If NAS is the selected storage type and settings exist, try to mount it
    if (settings && settings.storage_type === 'nas' && settings.nas_path) {
      const mounted = await mountNasStorage(settings.nas_path, settings.nas_username, settings.nas_password, db);
      if (mounted) {
        currentStoragePath = NAS_MOUNT_POINT;
        console.log(`Storage initialized using NAS at ${NAS_MOUNT_POINT}`);
      } else {
        currentStoragePath = LOCAL_STORAGE_PATH;
        console.log(`Failed to mount NAS, using local storage at ${LOCAL_STORAGE_PATH}`);
      }
    } else {
      currentStoragePath = LOCAL_STORAGE_PATH;
      console.log(`Storage initialized using local path at ${LOCAL_STORAGE_PATH}`);
    }
    
    // Ensure storage directories exist
    ensureStorageDirectories();
    
    return currentStoragePath;
  } catch (error) {
    console.error('Error initializing storage:', error);
    currentStoragePath = LOCAL_STORAGE_PATH;
    return LOCAL_STORAGE_PATH;
  }
}

/**
 * Ensure all necessary storage directories exist
 */
function ensureStorageDirectories() {
  try {
    if (!fs.existsSync(currentStoragePath)) {
      fs.mkdirSync(currentStoragePath, { recursive: true });
    }
    
    // Ensure the local storage path exists as fallback
    if (!fs.existsSync(LOCAL_STORAGE_PATH)) {
      fs.mkdirSync(LOCAL_STORAGE_PATH, { recursive: true });
    }
    
    // Create mount point if it doesn't exist
    if (!fs.existsSync(NAS_MOUNT_POINT)) {
      fs.mkdirSync(NAS_MOUNT_POINT, { recursive: true });
    }
  } catch (error) {
    console.error('Error ensuring storage directories:', error);
  }
}

/**
 * Check if a path is mounted
 * @param {string} mountPoint Path to check
 * @returns {Promise<boolean>} True if mounted
 */
async function isPathMounted(mountPoint) {
  try {
    const { stdout } = await execPromise('mount | grep -q "' + mountPoint + '" && echo "mounted" || echo "not mounted"');
    return stdout.trim() === 'mounted';
  } catch (error) {
    console.error('Error checking if path is mounted:', error);
    return false;
  }
}

/**
 * Mount NAS storage
 * @param {string} nasPath NAS path (e.g. //192.168.1.10/share)
 * @param {string} username NAS username
 * @param {string} password NAS password
 * @param {object} db SQLite database connection
 * @returns {Promise<boolean>} True if mounted successfully
 */
async function mountNasStorage(nasPath, username, password, db) {
  try {
    // First check if already mounted
    const mounted = await isPathMounted(NAS_MOUNT_POINT);
    if (mounted) {
      console.log(`NAS already mounted at ${NAS_MOUNT_POINT}`);
      return true;
    }
    
    // Build mount command
    let mountCmd = `mount -t cifs "${nasPath}" ${NAS_MOUNT_POINT}`;
    
    // Add credentials if provided
    if (username && password) {
      mountCmd += ` -o username="${username}",password="${password}",rw`;
    } else {
      mountCmd += ' -o guest,rw';
    }
    
    // Execute mount command
    await execPromise(mountCmd);
    
    // Verify mount was successful
    const mountVerify = await isPathMounted(NAS_MOUNT_POINT);
    
    // Update database with mount status
    await new Promise((resolve, reject) => {
      db.run('UPDATE settings SET nas_mounted = ? WHERE id = 1', [mountVerify ? 1 : 0], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Log event
    if (mountVerify) {
      const eventId = uuidv4();
      db.run(
        `INSERT INTO events (id, timestamp, event_type, message, severity) 
         VALUES (?, ?, ?, ?, ?)`,
        [eventId, new Date().toISOString(), 'system_updated', 
         `NAS storage mounted successfully at ${NAS_MOUNT_POINT}`, 'info']
      );
      
      broadcastEvent({
        id: eventId,
        timestamp: new Date().toISOString(),
        eventType: 'system_updated',
        message: `NAS storage mounted successfully`,
        severity: 'info'
      });
    }
    
    return mountVerify;
  } catch (error) {
    console.error('Error mounting NAS storage:', error);
    
    // Log error event
    const eventId = uuidv4();
    db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, new Date().toISOString(), 'system_error', 
       `Failed to mount NAS storage: ${error.message}`, 'error']
    );
    
    broadcastEvent({
      id: eventId,
      timestamp: new Date().toISOString(),
      eventType: 'system_error',
      message: `Failed to mount NAS storage: ${error.message}`,
      severity: 'error'
    });
    
    return false;
  }
}

/**
 * Unmount NAS storage
 * @returns {Promise<boolean>} True if unmounted successfully
 */
async function unmountNasStorage(db) {
  try {
    // First check if it's mounted
    const mounted = await isPathMounted(NAS_MOUNT_POINT);
    if (!mounted) {
      console.log(`NAS not mounted at ${NAS_MOUNT_POINT}`);
      return true;
    }
    
    // Execute unmount command
    await execPromise(`umount ${NAS_MOUNT_POINT}`);
    
    // Verify unmount was successful
    const stillMounted = await isPathMounted(NAS_MOUNT_POINT);
    
    // Update database with mount status
    await new Promise((resolve, reject) => {
      db.run('UPDATE settings SET nas_mounted = ? WHERE id = 1', [stillMounted ? 1 : 0], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Log event
    if (!stillMounted) {
      const eventId = uuidv4();
      db.run(
        `INSERT INTO events (id, timestamp, event_type, message, severity) 
         VALUES (?, ?, ?, ?, ?)`,
        [eventId, new Date().toISOString(), 'system_updated', 
         `NAS storage unmounted from ${NAS_MOUNT_POINT}`, 'info']
      );
      
      broadcastEvent({
        id: eventId,
        timestamp: new Date().toISOString(),
        eventType: 'system_updated',
        message: `NAS storage unmounted successfully`,
        severity: 'info'
      });
    }
    
    return !stillMounted;
  } catch (error) {
    console.error('Error unmounting NAS storage:', error);
    
    // Log error event
    const eventId = uuidv4();
    db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, new Date().toISOString(), 'system_error', 
       `Failed to unmount NAS storage: ${error.message}`, 'error']
    );
    
    broadcastEvent({
      id: eventId,
      timestamp: new Date().toISOString(),
      eventType: 'system_error',
      message: `Failed to unmount NAS storage: ${error.message}`,
      severity: 'error'
    });
    
    return false;
  }
}

/**
 * Validate NAS connection without mounting
 * @param {string} nasPath NAS path (e.g. //192.168.1.10/share)
 * @param {string} username NAS username
 * @param {string} password NAS password
 * @returns {Promise<object>} Validation result
 */
async function validateNasConnection(nasPath, username, password) {
  try {
    // Create temporary mount point for validation
    const tempMountPoint = `/tmp/visionhub_nas_test_${Date.now()}`;
    
    if (!fs.existsSync(tempMountPoint)) {
      fs.mkdirSync(tempMountPoint, { recursive: true });
    }
    
    // Build mount command
    let mountCmd = `mount -t cifs "${nasPath}" ${tempMountPoint}`;
    
    // Add credentials if provided
    if (username && password) {
      mountCmd += ` -o username="${username}",password="${password}",rw`;
    } else {
      mountCmd += ' -o guest,rw';
    }
    
    // Execute mount command
    await execPromise(mountCmd);
    
    // Try to write a test file to verify write permissions
    const testFilePath = path.join(tempMountPoint, `test_${Date.now()}.txt`);
    fs.writeFileSync(testFilePath, 'VisionHub NAS connection test');
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    // Unmount test directory
    await execPromise(`umount ${tempMountPoint}`);
    
    // Clean up temp directory
    try {
      fs.rmdirSync(tempMountPoint);
    } catch (rmError) {
      console.warn('Could not remove temporary mount point:', rmError.message);
    }
    
    return { success: true, message: 'NAS connection successful with read/write permissions' };
  } catch (error) {
    console.error('NAS validation error:', error);
    
    // Try to clean up if the mount point was created
    try {
      const tempMountPoint = `/tmp/visionhub_nas_test_${Date.now()}`;
      if (fs.existsSync(tempMountPoint)) {
        try {
          await execPromise(`umount ${tempMountPoint}`);
        } catch (unmountError) {
          // Ignore unmount errors
        }
        try {
          fs.rmdirSync(tempMountPoint);
        } catch (rmError) {
          // Ignore directory removal errors
        }
      }
    } catch (cleanupError) {
      console.warn('Error during cleanup:', cleanupError);
    }
    
    return { 
      success: false, 
      message: 'NAS connection failed',
      error: error.message
    };
  }
}

/**
 * Update storage settings and reconfigure storage
 * @param {object} settings New storage settings
 * @param {object} db SQLite database connection
 * @returns {Promise<object>} Updated settings
 */
async function updateStorageSettings(settings, db) {
  try {
    // If switching to NAS or updating NAS settings
    if (settings.storage_type === 'nas' && settings.nas_path) {
      // First unmount any existing NAS
      await unmountNasStorage(db);
      
      // Then try to mount the new NAS
      const mounted = await mountNasStorage(settings.nas_path, settings.nas_username, settings.nas_password, db);
      
      if (mounted) {
        currentStoragePath = NAS_MOUNT_POINT;
        console.log(`Updated storage to use NAS at ${NAS_MOUNT_POINT}`);
      } else {
        currentStoragePath = LOCAL_STORAGE_PATH;
        console.log(`Failed to mount NAS, using local storage at ${LOCAL_STORAGE_PATH}`);
      }
      
      // Update settings in database
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE settings SET 
           storage_type = ?,
           nas_path = ?,
           nas_username = ?,
           nas_password = ?,
           nas_mounted = ?
           WHERE id = 1`,
          [settings.storage_type, settings.nas_path, settings.nas_username, settings.nas_password, mounted ? 1 : 0],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      return {
        ...settings,
        nas_mounted: mounted
      };
    }
    // If switching to local storage from NAS
    else if (settings.storage_type === 'local' && currentStoragePath === NAS_MOUNT_POINT) {
      // Unmount existing NAS
      await unmountNasStorage(db);
      currentStoragePath = LOCAL_STORAGE_PATH;
      
      // Update settings in database
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE settings SET 
           storage_type = ?,
           nas_mounted = 0
           WHERE id = 1`,
          [settings.storage_type],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      console.log(`Updated storage to use local path at ${LOCAL_STORAGE_PATH}`);
      
      return {
        ...settings,
        nas_mounted: false
      };
    }
    // No storage type change, just return settings
    else {
      return settings;
    }
  } catch (error) {
    console.error('Error updating storage settings:', error);
    throw error;
  }
}

module.exports = {
  getStoragePath,
  initializeStorage,
  mountNasStorage,
  unmountNasStorage,
  validateNasConnection,
  updateStorageSettings,
  NAS_MOUNT_POINT,
  LOCAL_STORAGE_PATH
};
