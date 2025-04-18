
const WebSocket = require('ws');

let wss;
let clients = new Map(); // Maps clientId to WebSocket client

/**
 * Initialize the WebSocket server
 * @param {object} server - HTTP/S server instance
 */
function initWebSocketServer(server) {
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws) => {
    const clientId = Date.now() + Math.random().toString(36).substr(2, 9);
    clients.set(clientId, ws);
    console.log(`WebSocket client connected: ${clientId}`);
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      clientId
    }));
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`Received message from client ${clientId}:`, data);
        
        // Handle different message types here if needed
      } catch (err) {
        console.error('Invalid WebSocket message:', err);
      }
    });
    
    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });
  });
  
  console.log('WebSocket server initialized');
}

/**
 * Broadcast message to all connected clients
 * @param {string} type - Message type 
 * @param {object} data - Message data
 */
function broadcast(type, data) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Broadcast camera status update
 * @param {string} cameraId - Camera ID
 * @param {string} status - Camera status (active, offline, etc.)
 * @param {boolean} isRecording - Recording status
 */
function broadcastCameraStatus(cameraId, status, isRecording) {
  broadcast('camera_status', {
    id: cameraId,
    status,
    isRecording,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Broadcast system event
 * @param {object} event - Event data
 */
function broadcastEvent(event) {
  broadcast('event', event);
}

module.exports = {
  initWebSocketServer,
  broadcast,
  broadcastCameraStatus,
  broadcastEvent
};
