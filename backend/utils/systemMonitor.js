
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');

const execPromise = promisify(exec);

/**
 * Get disk space information for a specific path
 * @param {string} path - Directory path to check
 * @returns {Promise<object>} - Disk space info with total, used, and free space
 */
async function getDiskSpace(path = '/') {
  try {
    const { stdout } = await execPromise(`df -k "${path}" | tail -1`);
    const parts = stdout.trim().split(/\s+/);
    
    // df output format: Filesystem 1K-blocks Used Available Use% Mounted on
    const total = parseInt(parts[1]) * 1024; // Convert to bytes
    const used = parseInt(parts[2]) * 1024;
    const free = parseInt(parts[3]) * 1024;
    
    return { 
      total, 
      used, 
      free,
      path
    };
  } catch (error) {
    console.error('Error getting disk space:', error);
    return {
      total: 0,
      used: 0,
      free: 0,
      path
    };
  }
}

/**
 * Get CPU usage as a percentage
 * @returns {Promise<number>} - CPU usage percentage
 */
async function getCpuUsage() {
  try {
    // Get CPU info over a 1 second period
    const startMeasure = getCpuInfo();
    
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get CPU info again
    const endMeasure = getCpuInfo();
    
    // Calculate CPU usage
    let idleDiff = endMeasure.idle - startMeasure.idle;
    let totalDiff = endMeasure.total - startMeasure.total;
    
    const percentUsed = 100 - Math.floor(100 * idleDiff / totalDiff);
    return percentUsed;
  } catch (error) {
    console.error('Error getting CPU usage:', error);
    return 0;
  }
}

/**
 * Get current CPU information
 * @returns {object} - CPU info with idle and total times
 */
function getCpuInfo() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  
  return {
    idle,
    total
  };
}

/**
 * Get memory usage information
 * @returns {object} - Memory info with total, used, and free memory
 */
function getMemoryInfo() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  return {
    total: totalMemory,
    used: usedMemory,
    free: freeMemory
  };
}

/**
 * Count active camera streams
 * @param {object} db - Database connection
 * @returns {Promise<number>} - Number of active streams
 */
async function countActiveStreams(db) {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM cameras WHERE status = "active" OR status = "recording"', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row?.count || 0);
      }
    });
  });
}

/**
 * Get camera connection statistics
 * @param {object} db - Database connection
 * @returns {Promise<object>} - Camera statistics
 */
async function getCameraStats(db) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status = "active" OR status = "recording" THEN 1 ELSE 0 END) as connected FROM cameras', 
      [], 
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            total: row?.total || 0,
            connected: row?.connected || 0
          });
        }
      }
    );
  });
}

/**
 * Get complete system diagnostics
 * @param {object} db - Database connection
 * @returns {Promise<object>} - System diagnostics information
 */
async function getSystemDiagnostics(db) {
  try {
    // Get all diagnostics concurrently
    const [cpuUsage, diskSpace, cameraStats] = await Promise.all([
      getCpuUsage(),
      getDiskSpace('/'),
      getCameraStats(db)
    ]);
    
    const memory = getMemoryInfo();
    const uptime = os.uptime();
    
    return {
      cpu: cpuUsage,
      memory,
      disk: diskSpace,
      uptime,
      activeStreams: cameraStats.connected,
      connectedCameras: cameraStats.connected,
      totalCameras: cameraStats.total
    };
  } catch (error) {
    console.error('Error getting system diagnostics:', error);
    
    // Return fallback data
    return {
      cpu: 0,
      memory: {
        total: 0,
        used: 0,
        free: 0
      },
      disk: {
        total: 0,
        used: 0,
        free: 0,
        path: '/'
      },
      uptime: 0,
      activeStreams: 0,
      connectedCameras: 0,
      totalCameras: 0
    };
  }
}

module.exports = {
  getDiskSpace,
  getCpuUsage,
  getMemoryInfo,
  getSystemDiagnostics
};
