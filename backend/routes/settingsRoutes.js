
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { validateNasConnection, updateStorageSettings } = require('../utils/storageManager');
const { broadcastEvent } = require('../utils/websocketManager');

const router = express.Router();

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
    nas_password
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
                 retention_days = ?
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
        retention_days
      ], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    
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
      nas_mounted: updatedStorageSettings.nas_mounted
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

module.exports = router;

