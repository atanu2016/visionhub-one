
// Define types for our camera management system

export type CameraStatus = 'active' | 'idle' | 'recording' | 'warning' | 'danger' | 'offline';

export interface Camera {
  id: string;
  name: string;
  ipAddress: string;
  streamUrl: string;
  onvifPort: number;
  username: string;
  password: string;
  status: CameraStatus;
  motionDetection: boolean;
  motionSensitivity: number; // 0-100
  location: string;
  manufacturer?: string;
  model?: string;
  lastUpdated: string; // ISO date string
  thumbnail?: string;
  isRecording: boolean;
}

export type StorageType = 'local' | 'nas';

export interface SystemSettings {
  storageLocation: string;
  networkSubnet: string;
  recordingFormat: 'mp4' | 'mkv' | 'avi';
  recordingQuality: 'low' | 'medium' | 'high';
  motionDetectionEnabled: boolean;
  alertEmail?: string;
  alertWebhookUrl?: string;
  retentionDays: number;
  // Storage settings
  storageType: StorageType;
  nasPath?: string;
  nasUsername?: string;
  nasPassword?: string;
  nasMounted?: boolean;
  // SSL settings
  sslEnabled: boolean;
  sslCertPath?: string;
  sslKeyPath?: string;
  // SMTP settings
  smtpServer?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpSenderEmail?: string;
  // System info
  appVersion?: string;
  dbVersion?: number;
}

export interface RecordingEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  startTime: string; // ISO date string
  endTime?: string; // ISO date string
  duration?: number; // seconds
  triggerType: 'motion' | 'manual' | 'scheduled';
  fileSize?: number; // bytes
  filePath: string;
  thumbnail?: string;
}

export interface SystemEvent {
  id: string;
  timestamp: string; // ISO date string
  eventType: 'camera_added' | 'camera_removed' | 'camera_updated' | 'motion_detected' | 'recording_started' | 'recording_stopped' | 'system_started' | 'system_error' | 'system_updated';
  message: string;
  cameraId?: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SystemDiagnostics {
  cpu: number; // percentage
  memory: {
    total: number; // bytes
    used: number; // bytes
    free: number; // bytes
  };
  disk: {
    total: number; // bytes
    used: number; // bytes 
    free: number; // bytes
    path: string;
  };
  uptime: number; // seconds
  activeStreams: number;
  connectedCameras: number;
  totalCameras: number;
}

