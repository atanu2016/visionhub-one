
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { getStoragePath } = require('../utils/storageManager');

const router = express.Router();

// GET /api/recordings - List all recordings
router.get('/', (req, res) => {
  req.db.all(
    `SELECT r.*, c.name as camera_name 
     FROM recordings r 
     LEFT JOIN cameras c ON r.camera_id = c.id 
     ORDER BY r.start_time DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Transform rows to match frontend types
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
        thumbnail: row.thumbnail ? `/api/recordings/${row.id}/thumbnail` : null
      }));
      
      res.json(recordings);
    }
  );
});

// GET /api/recordings/:id/thumbnail - Get recording thumbnail
router.get('/:id/thumbnail', (req, res) => {
  const { id } = req.params;
  
  req.db.get('SELECT thumbnail FROM recordings WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row || !row.thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }
    
    // Send thumbnail file
    res.sendFile(row.thumbnail);
  });
});

// DELETE /api/recordings/:id - Delete a recording
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  req.db.get('SELECT * FROM recordings WHERE id = ?', [id], (err, recording) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    // Delete files
    if (recording.file_path && fs.existsSync(recording.file_path)) {
      fs.unlinkSync(recording.file_path);
    }
    
    if (recording.thumbnail && fs.existsSync(recording.thumbnail)) {
      fs.unlinkSync(recording.thumbnail);
    }
    
    // Delete from database
    req.db.run('DELETE FROM recordings WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Log event
      const eventId = uuidv4();
      req.db.run(
        `INSERT INTO events (id, timestamp, event_type, message, camera_id, severity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [eventId, new Date().toISOString(), 'recording_deleted',
         `Recording deleted from camera ${recording.camera_name}`,
         recording.camera_id, 'info']
      );
      
      res.json({ success: true });
    });
  });
});

module.exports = router;
