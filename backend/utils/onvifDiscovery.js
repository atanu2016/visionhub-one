
const onvif = require('onvif');
const ip = require('ip');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

/**
 * Scan network for ONVIF cameras
 * @param {string} subnet - Subnet to scan, e.g. "192.168.1.0/24"
 * @returns {Promise<Array>} - Array of discovered cameras
 */
const discoverCameras = async (subnet) => {
  console.log(`Starting camera discovery on subnet: ${subnet}`);
  
  try {
    // Parse subnet to get range
    const network = subnet.split('/')[0];
    const subnetMask = parseInt(subnet.split('/')[1], 10);
    
    // If no subnet provided, use the local network
    const targetSubnet = network === '0.0.0.0' ? 
      `${ip.address().split('.').slice(0, 3).join('.')}.0/${subnetMask || 24}` : 
      subnet;
    
    return new Promise((resolve) => {
      // Create discovery object
      const discovery = new onvif.Discovery();
      const discoveredDevices = [];
      
      // Add event handlers
      discovery.on('device', function(device) {
        console.log(`Found device: ${device.hostname}`);
        discoveredDevices.push({
          xaddrs: device.xaddrs,
          name: device.name || 'Unknown Camera',
          ipAddress: device.hostname,
          port: parseInt(device.port || '80', 10)
        });
      });
      
      discovery.on('error', function(error) {
        console.error('Discovery error:', error);
      });
      
      // Start discovery with a timeout
      setTimeout(() => {
        console.log(`Discovery finished. Found ${discoveredDevices.length} devices.`);
        
        // Process discovered devices to get more info
        const processDevices = async () => {
          const processedDevices = [];
          
          for (const device of discoveredDevices) {
            try {
              // Attempt to get camera details via ONVIF
              const cam = new onvif.Cam({
                hostname: device.ipAddress,
                port: device.port,
                username: '',
                password: ''
              });
              
              // Get camera information (make this a promise)
              const deviceInfo = await new Promise((resolve, reject) => {
                cam.getDeviceInformation((err, info) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  resolve(info);
                });
              });
              
              // Get stream URL (make this a promise)
              const streamUrl = await new Promise((resolve, reject) => {
                cam.getStreamUri({ protocol: 'RTSP' }, (err, stream) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  resolve(stream);
                });
              });
              
              processedDevices.push({
                name: deviceInfo.model || device.name,
                ipAddress: device.ipAddress,
                port: device.port,
                manufacturer: deviceInfo.manufacturer || 'Unknown',
                model: deviceInfo.model || 'Unknown',
                firmware: deviceInfo.firmwareVersion || 'Unknown',
                serialNumber: deviceInfo.serialNumber || 'Unknown',
                streamUrl: streamUrl ? streamUrl.uri : null,
                onvifPort: device.port
              });
            } catch (err) {
              console.error(`Error processing device ${device.ipAddress}:`, err);
              // Add with basic info even if we can't get all details
              processedDevices.push({
                name: device.name || 'Unknown Camera',
                ipAddress: device.ipAddress,
                port: device.port,
                manufacturer: 'Unknown',
                model: 'Unknown',
                onvifPort: device.port
              });
            }
          }
          
          return processedDevices;
        };
        
        processDevices().then(devices => resolve(devices));
      }, 5000); // 5 second discovery timeout
      
      // Start the discovery
      discovery.start();
    });
  } catch (error) {
    console.error('Failed to discover cameras:', error);
    return [];
  }
};

module.exports = {
  discoverCameras
};
