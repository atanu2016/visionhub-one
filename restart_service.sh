
#!/bin/bash

echo "Restarting VisionHub One Sentinel service..."

# Ensure proper permissions on critical directories
chmod -R 777 /var/visionhub
chmod -R 777 /var/log/visionhub

# Reload systemd to recognize service changes
systemctl daemon-reload

# Restart the service
systemctl restart visionhub

# Wait a few seconds
sleep 5

# Check status
echo "Service status:"
systemctl status visionhub

echo ""
echo "If the service is still failing, try running the backend directly:"
echo "cd /opt/visionhub-sentinel && NODE_OPTIONS=\"--no-warnings\" node backend/index.js"
echo ""
echo "To view detailed logs:"
echo "journalctl -u visionhub -f"
