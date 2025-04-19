
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// GET /api/events - List all events with optional filters
router.get('/', (req, res) => {
  // Get query parameters for filtering
  const { 
    eventType, 
    cameraId, 
    severity, 
    startDate, 
    endDate,
    limit = 100
  } = req.query;
  
  let query = 'SELECT * FROM events WHERE 1=1';
  const params = [];
  
  // Add filters if provided
  if (eventType) {
    query += ' AND event_type = ?';
    params.push(eventType);
  }
  
  if (cameraId) {
    query += ' AND camera_id = ?';
    params.push(cameraId);
  }
  
  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }
  
  if (startDate) {
    query += ' AND timestamp >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND timestamp <= ?';
    params.push(endDate);
  }
  
  // Order by timestamp descending (newest first)
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit, 10));
  
  req.db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching events:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Transform database rows to match frontend model
    const events = rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      message: row.message,
      cameraId: row.camera_id || null,
      severity: row.severity
    }));
    
    res.json(events);
  });
});

// POST /api/events - Create a new event
router.post('/', (req, res) => {
  const { eventType, message, cameraId, severity = 'info' } = req.body;
  
  if (!eventType || !message) {
    return res.status(400).json({ error: 'Event type and message are required' });
  }
  
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  
  const query = `INSERT INTO events (id, timestamp, event_type, message, camera_id, severity) 
                VALUES (?, ?, ?, ?, ?, ?)`;
  
  req.db.run(query, [id, timestamp, eventType, message, cameraId, severity], function(err) {
    if (err) {
      console.error('Error creating event:', err);
      return res.status(500).json({ error: err.message });
    }
    
    res.status(201).json({
      id,
      timestamp,
      eventType,
      message,
      cameraId,
      severity
    });
  });
});

module.exports = router;
