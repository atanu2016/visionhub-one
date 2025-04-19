
const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/recordings - List all recordings
router.get('/', (req, res) => {
  req.db.all(
    `SELECT * FROM recordings ORDER BY start_time DESC`, 
    [], 
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const recordings = rows.map(row => ({
        id: row.id,
        cameraId: row.camera_id,
        cameraName: row.camera_name,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration,
        triggerType: row.trigger_type,
        filePath: row.file_path,
        thumbnail: row.thumbnail,
        fileSize: row.file_size
      }));
      
      res.json(recordings);
    }
  );
});

// GET /api/recordings/:id - Get a specific recording
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  req.db.get(
    `SELECT * FROM recordings WHERE id = ?`, 
    [id], 
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Recording not found' });
      }
      
      const recording = {
        id: row.id,
        cameraId: row.camera_id,
        cameraName: row.camera_name,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration,
        triggerType: row.trigger_type,
        filePath: row.file_path,
        thumbnail: row.thumbnail,
        fileSize: row.file_size
      };
      
      res.json(recording);
    }
  );
});

// DELETE /api/recordings/:id - Delete a recording
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // Get the recording file path before deletion
  req.db.get(
    `SELECT file_path, thumbnail FROM recordings WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Recording not found' });
      }
      
      // Delete from database
      req.db.run(
        `DELETE FROM recordings WHERE id = ?`,
        [id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Delete physical files if they exist
          if (row.file_path && fs.existsSync(row.file_path)) {
            fs.unlinkSync(row.file_path);
          }
          
          if (row.thumbnail && fs.existsSync(row.thumbnail)) {
            fs.unlinkSync(row.thumbnail);
          }
          
          // Add event for recording deletion
          const eventId = uuidv4();
          req.db.run(
            `INSERT INTO events (id, timestamp, event_type, message, severity) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              eventId,
              new Date().toISOString(),
              'recording_deleted',
              `Recording ${id} has been deleted`,
              'info'
            ]
          );
          
          res.json({ success: true });
        }
      );
    }
  );
});

// GET /api/recordings/:id/export - Export a recording
router.get('/:id/export', (req, res) => {
  const { id } = req.params;
  
  req.db.get(
    `SELECT file_path, camera_name, start_time FROM recordings WHERE id = ?`, 
    [id], 
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Recording not found' });
      }
      
      // Check if file exists
      if (!fs.existsSync(row.file_path)) {
        return res.status(404).json({ error: 'Recording file not found' });
      }
      
      // Format the filename for download
      const fileName = `${row.camera_name.replace(/[^a-z0-9]/gi, '_')}_${new Date(row.start_time).toISOString().replace(/:/g, '-')}.mp4`;
      const fileUrl = `/recordings/${path.basename(row.file_path)}`;
      
      // Log the export event
      const eventId = uuidv4();
      req.db.run(
        `INSERT INTO events (id, timestamp, event_type, message, severity) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          eventId,
          new Date().toISOString(),
          'recording_exported',
          `Recording ${id} has been exported`,
          'info'
        ]
      );
      
      res.json({ downloadUrl: fileUrl, fileName });
    }
  );
});

module.exports = router;
