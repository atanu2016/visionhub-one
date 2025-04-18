const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { validateNasConnection, updateStorageSettings } = require('../utils/storageManager');
const { broadcastEvent } = require('../utils/websocketManager');
const { getDiskSpace, getSystemDiagnostics } = require('../utils/systemMonitor');

const router = express.Router();

// Configure multer for file uploads
const sslStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../ssl');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Keep original filename
    cb(null, file.originalname);
  }
});

const backupStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../backups');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use timestamp for unique filename
    const fileName = `backup-${Date.now()}.zip`;
    cb(null, fileName);
  }
});

const uploadSSL = multer({ storage: sslStorage });
const uploadBackup = multer({ storage: backupStorage });

// GET /api/settings - Get system settings
router.get('/', (req, res) => {
  req.db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row);
  });
});

// PUT /api/settings - Update system settings
router.put('/', async (req, res) => {
  const { 
    storage_location, 
    network_subnet, 
    recording_format, 
    recording_quality, 
    motion_detection_enabled, 
    alert_email,
    alert_webhook_url, 
    retention_days,
    storage_type,
    nas_path,
    nas_username,
    nas_password,
    ssl_enabled,
    ssl_cert_path,
    ssl_key_path,
    smtp_server,
    smtp_port,
    smtp_username,
    smtp_password,
    smtp_sender_email
  } = req.body;
  
  try {
    // First handle storage configuration
    let updatedStorageSettings = {};
    
    if (storage_type) {
      updatedStorageSettings = await updateStorageSettings({
        storage_type,
        nas_path,
        nas_username,
        nas_password
      }, req.db);
    }
    
    // Then update other settings
    const sql = `UPDATE settings SET 
                 storage_location = ?,
                 network_subnet = ?,
                 recording_format = ?,
                 recording_quality = ?,
                 motion_detection_enabled = ?,
                 alert_email = ?,
                 alert_webhook_url = ?,
                 retention_days = ?,
                 ssl_enabled = ?,
                 ssl_cert_path = ?,
                 ssl_key_path = ?,
                 smtp_server = ?,
                 smtp_port = ?,
                 smtp_username = ?,
                 smtp_password = ?,
                 smtp_sender_email = ?
                 WHERE id = 1`;
                 
    await new Promise((resolve, reject) => {
      req.db.run(sql, [
        storage_location,
        network_subnet,
        recording_format,
        recording_quality,
        motion_detection_enabled ? 1 : 0,
        alert_email,
        alert_webhook_url,
        retention_days,
        ssl_enabled ? 1 : 0,
        ssl_cert_path,
        ssl_key_path,
        smtp_server,
        smtp_port,
        smtp_username,
        smtp_password,
        smtp_sender_email
      ], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    
    // Handle SSL configuration change
    if (ssl_enabled && ssl_cert_path && ssl_key_path) {
      // Logic to restart the server with HTTPS will be in the main server file
      // Just set the flag here, and it will be picked up on next server restart
      console.log('SSL has been enabled, restart required to apply changes');
    }
    
    // Log event
    const eventId = uuidv4();
    const eventSql = `INSERT INTO events (id, timestamp, event_type, message, severity) 
                     VALUES (?, ?, ?, ?, ?)`;
    req.db.run(eventSql, [
      eventId,
      new Date().toISOString(),
      'system_updated',
      'System settings updated',
      'info'
    ]);
    
    // Broadcast event
    broadcastEvent({
      id: eventId,
      timestamp: new Date().toISOString(),
      eventType: 'system_updated',
      message: 'System settings updated',
      severity: 'info'
    });
    
    // Return updated settings
    res.json({ 
      storage_location, 
      network_subnet, 
      recording_format, 
      recording_quality, 
      motion_detection_enabled: !!motion_detection_enabled, 
      alert_email,
      alert_webhook_url, 
      retention_days,
      storage_type,
      nas_path,
      nas_username,
      nas_password,
      nas_mounted: updatedStorageSettings.nas_mounted,
      ssl_enabled,
      ssl_cert_path,
      ssl_key_path,
      smtp_server,
      smtp_port,
      smtp_username,
      smtp_password,
      smtp_sender_email
    });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/nas/validate - Validate NAS connection
router.post('/nas/validate', async (req, res) => {
  const { path, username, password } = req.body;
  
  if (!path) {
    return res.status(400).json({
      success: false,
      error: 'NAS path is required'
    });
  }
  
  try {
    const result = await validateNasConnection(path, username, password);
    res.json(result);
  } catch (error) {
    console.error('Error validating NAS connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/settings/ssl/certificate - Upload SSL certificate
router.post('/ssl/certificate', uploadSSL.single('certificate'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No certificate file uploaded' });
  }
  
  const certPath = path.join('/ssl', req.file.originalname);
  
  res.json({
    success: true,
    path: certPath
  });
});

// POST /api/settings/ssl/key - Upload SSL key
router.post('/ssl/key', uploadSSL.single('key'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No key file uploaded' });
  }
  
  const keyPath = path.join('/ssl', req.file.originalname);
  
  res.json({
    success: true,
    path: keyPath
  });
});

// GET /api/settings/update/check - Check for system updates
router.get('/update/check', async (req, res) => {
  try {
    // Use simple command to check git for updates
    const scriptPath = path.join(__dirname, '../../scripts/update.sh');
    const currentVersion = '1.0.0'; // This should come from a version file
    
    // Get current branch name
    const { stdout: branchOutput } = await exec('git branch --show-current');
    const branch = branchOutput.trim();
    
    // Check if there are updates available (simplified for this example)
    await exec('git fetch');
    const { stdout } = await exec(`git log HEAD..origin/${branch} --oneline`);
    
    const hasUpdate = stdout.length > 0;
    let changelog = '';
    
    // If update available, get the changelog
    if (hasUpdate) {
      try {
        // Try to get recent changes (last 5 commits)
        const { stdout: changelogOutput } = await exec('git log -n 5 --pretty=format:"%h %s (%an, %ar)"');
        changelog = changelogOutput;
      } catch (error) {
        console.error('Error getting changelog:', error);
        changelog = 'Changelog not available';
      }
    }
    
    res.json({
      version: hasUpdate ? 'Latest Version' : currentVersion,
      hasUpdate,
      changelog: hasUpdate ? changelog : null
    });
  } catch (error) {
    console.error('Error checking for updates:', error);
    res.status(500).json({ error: 'Failed to check for updates', details: error.message });
  }
});

// POST /api/settings/update/install - Install system update
router.post('/update/install', (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../../scripts/update.sh');
    
    // Make sure the script is executable
    fs.chmodSync(scriptPath, '755');
    
    // Log the update attempt
    const eventId = uuidv4();
    req.db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        eventId,
        new Date().toISOString(),
        'system_updated',
        'System update started',
        'info'
      ]
    );
    
    // Broadcast the event
    broadcastEvent({
      id: eventId,
      timestamp: new Date().toISOString(),
      eventType: 'system_updated',
      message: 'System update started',
      severity: 'info'
    });
    
    // First respond to the request
    res.json({ success: true, message: 'Update process initiated' });
    
    // Then execute the update script (will restart the server)
    setTimeout(() => {
      exec(`sudo ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Update script error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`Update script stderr: ${stderr}`);
          return;
        }
        console.log(`Update script stdout: ${stdout}`);
      });
    }, 1000);
    
  } catch (error) {
    console.error('Error installing update:', error);
    res.status(500).json({ error: 'Failed to install update', details: error.message });
  }
});

// GET /api/settings/backup - Create system backup
router.get('/backup', async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFilename = `visionhub-backup-${timestamp}.zip`;
    const backupPath = path.join(backupDir, backupFilename);
    
    // Create backup of the database
    const dbPath = req.app.get('dbPath') || path.join(__dirname, '../../db/visionhub.db');
    const tempBackupDir = path.join(backupDir, 'temp');
    
    if (!fs.existsSync(tempBackupDir)) {
      fs.mkdirSync(tempBackupDir, { recursive: true });
    }
    
    // Copy database to temp dir
    fs.copyFileSync(dbPath, path.join(tempBackupDir, 'visionhub.db'));
    
    // Create zip archive
    await new Promise((resolve, reject) => {
      exec(`zip -r "${backupPath}" "${tempBackupDir}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Backup creation error: ${error.message}`);
          reject(error);
          return;
        }
        resolve();
      });
    });
    
    // Clean up temp dir
    fs.rmSync(tempBackupDir, { recursive: true, force: true });
    
    // Log the backup creation
    const eventId = uuidv4();
    req.db.run(
      `INSERT INTO events (id, timestamp, event_type, message, severity) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        eventId,
        new Date().toISOString(),
        'system_updated',
        'System backup created',
        'info'
      ]
    );
    
    // Return download URL
    const downloadUrl = `/backups/${backupFilename}`;
    res.json({ success: true, downloadUrl });
    
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup', details: error.message });
  }
});

// POST /api/settings/restore - Restore system from backup
router.post('/restore', uploadBackup.single('backup'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No backup file uploaded' });
  }
  
  try {
    const backupPath = req.file.path;
    const extractDir = path.join(__dirname, '../../backups/extract');
    
    // Create extract directory
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    } else {
      // Clean existing extract directory
      fs.rmSync(extractDir, { recursive: true, force: true });
      fs.mkdirSync(extractDir);
    }
    
    // Extract the backup
    await new Promise((resolve, reject) => {
      exec(`unzip "${backupPath}" -d "${extractDir}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Restore extraction error: ${error.message}`);
          reject(error);
          return;
        }
        resolve();
      });
    });
    
    // Find the database file in the extracted files
    let dbFile = null;
    const findDbFile = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          findDbFile(filePath);
        } else if (file === 'visionhub.db') {
          dbFile = filePath;
          return;
        }
      }
    };
    
    findDbFile(extractDir);
    
    if (!dbFile) {
      throw new Error('Database file not found in backup');
    }
    
    // Get current DB path
    const currentDbPath = req.app.get('dbPath') || path.join(__dirname, '../../db/visionhub.db');
    
    // Create a backup of the current DB just in case
    const tempBackup = `${currentDbPath}.bak`;
    fs.copyFileSync(currentDbPath, tempBackup);
    
    try {
      // Close the current database connection
      req.db.close();
      
      // Replace the database file
      fs.copyFileSync(dbFile, currentDbPath);
      
      // Log the restore operation (note: must be done after DB reconnection)
      const eventId = uuidv4();
      const eventMessage = 'System restored from backup';
      
      // Reopen the database connection (this has to be handled by the main app)
      // For now, we'll just return success and the app will need to be restarted
      
      res.json({ 
        success: true, 
        message: eventMessage,
        restartRequired: true
      });
      
      // Clean up
      fs.rmSync(extractDir, { recursive: true, force: true });
      
      // After responding, restart the application (would be handled by systemd in production)
      setTimeout(() => {
        process.exit(0);
      }, 1000);
      
    } catch (error) {
      // Restore from backup if something went wrong
      fs.copyFileSync(tempBackup, currentDbPath);
      throw error;
    }
    
  } catch (error) {
    console.error('Error restoring from backup:', error);
    res.status(500).json({ error: 'Failed to restore system', details: error.message });
  }
});

module.exports = router;
