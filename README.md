
# VisionHub One Sentinel

VisionHub One Sentinel is a comprehensive surveillance system management platform designed for small to medium-sized deployments. It provides camera management, recording, motion detection, and system monitoring capabilities through a user-friendly web interface.

## System Requirements

- Ubuntu Server 22.04 LTS (or compatible Linux distribution)
- 4GB RAM minimum (8GB+ recommended)
- 4 CPU cores minimum
- 20GB storage for OS and application
- Additional storage for recordings (depends on your needs)
- Network connectivity to your camera system

## Installation

### Automated Installation

The easiest way to install VisionHub One Sentinel is using the provided installation script:

```bash
# Download the installation package
wget https://example.com/visionhub-sentinel.tar.gz
tar -xzf visionhub-sentinel.tar.gz
cd visionhub-sentinel

# Run the installer (as root)
sudo ./scripts/install.sh
```

The installer will:

1. Install all required system dependencies (Node.js, ffmpeg, sqlite3, etc.)
2. Create necessary directories
3. Build the frontend
4. Configure NGINX as a web server
5. Set up the backend as a systemd service
6. Generate self-signed SSL certificates
7. Create a default admin user

### Installation Options

The installer supports several options:

```bash
sudo ./scripts/install.sh [OPTIONS]

Options:
  -d, --directory DIR    Installation directory (default: /opt/visionhub-sentinel)
  -p, --port PORT        Frontend port (default: 80)
  -b, --backend-port PORT Backend port (default: 3000)
  --help                 Show this help
```

## Accessing the System

After installation, you can access VisionHub One Sentinel through your web browser:

```
http://YOUR_SERVER_IP
```

### Default Login

The system is pre-configured with a default administrator account:

- Username: `admin`
- Password: `Admin123!`

**IMPORTANT**: Change the default password immediately after your first login.

## Configuration Guide

### Changing the Default Admin Password

1. Log in with the default credentials
2. Go to the Settings page
3. Click on "User Management"
4. Select the admin user
5. Click "Change Password"
6. Enter and confirm your new password

### Adding Cameras

VisionHub supports multiple methods to add cameras:

1. **Automatic Discovery**:
   - Go to Cameras page
   - Click "Discover" button
   - Enter your network subnet (e.g., 192.168.1.0/24)
   - Select cameras from the discovered list

2. **Manual Addition**:
   - Go to Cameras page
   - Click "Add Camera"
   - Enter the camera details:
     - Name
     - IP address
     - RTSP/RTMP URL
     - Login credentials (if required)

### Configuring Storage

VisionHub supports both local and network storage:

1. **Local Storage**:
   - Default: `/var/visionhub/recordings`
   - To change, go to Settings → Storage

2. **NAS/SMB/CIFS Storage**:
   - Go to Settings → Storage
   - Select "Network Storage"
   - Enter:
     - Server path (e.g., `//192.168.1.100/surveillance`)
     - Username and password (if required)
     - Click "Test Connection" before saving

### Configuring SSL

The system automatically generates self-signed certificates during installation. To use your own certificates:

1. Go to Settings → System → SSL Configuration
2. Upload your certificate and private key files
3. Enable SSL
4. The system will restart with HTTPS enabled

### Setting Up Email Alerts

To receive notifications about system events:

1. Go to Settings → Alerts
2. Configure SMTP settings:
   - SMTP server address
   - Port
   - Username and password (if required)
   - Sender email address
3. Add recipient email addresses
4. Select which events trigger alerts
5. Click "Test" to verify your configuration

## System Maintenance

### Viewing Logs

```bash
# Backend service logs
sudo journalctl -u visionhub -f

# Detailed logs
sudo cat /var/log/visionhub/visionhub.log

# Error logs
sudo cat /var/log/visionhub/visionhub-error.log

# Web server logs
sudo cat /var/log/visionhub/nginx-access.log
sudo cat /var/log/visionhub/nginx-error.log
```

### Backing Up the System

1. Go to Settings → System → Backup & Restore
2. Click "Create Backup"
3. Download the backup file to a safe location

### Restoring from Backup

1. Go to Settings → System → Backup & Restore
2. Click "Restore Backup"
3. Select your backup file
4. Confirm the restoration

### Updating the System

```bash
# Run the update script
sudo ./scripts/update.sh
```

## Troubleshooting

### Common Issues

1. **Camera Connection Failures**
   - Check if the camera is reachable (ping the IP address)
   - Verify RTSP/RTMP URL format
   - Check username and password
   - Ensure port 554 (RTSP) is accessible

2. **Recording Issues**
   - Check storage permissions
   - Verify available disk space
   - Check ffmpeg logs for encoding errors

3. **Web Interface Not Accessible**
   - Verify NGINX is running: `systemctl status nginx`
   - Check backend service: `systemctl status visionhub`
   - Verify firewall settings allow access to frontend port

4. **Email Alerts Not Working**
   - Check SMTP settings
   - Verify sendmail is running: `systemctl status sendmail`
   - Check for email logs: `tail -f /var/log/mail.log`

For additional support, please create an issue in the GitHub repository.

## License

VisionHub One Sentinel is licensed under [LICENSE NAME]. See LICENSE file for details.
