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

export type StorageType = 'local' | 'nas' | 'smb';
export type RecordingQuality = 'low' | 'medium' | 'high';
export type RecordingFormat = 'mp4' | 'mkv' | 'avi';

export interface SystemSettings {
  storageLocation: string;
  networkSubnet: string;
  recordingFormat: RecordingFormat;
  recordingQuality: RecordingQuality;
  motionDetectionEnabled: boolean;
  alertEmail?: string;
  alertWebhookUrl?: string;
  retentionDays: number;
  storageType: StorageType;
  nasPath?: string;
  nasUsername?: string;
  nasPassword?: string;
  nasMounted?: boolean;
  sslEnabled?: boolean;
  sslCertPath?: string;
  sslKeyPath?: string;
  appVersion?: string;
  smtpServer?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpSenderEmail?: string;
  motionAlerts?: boolean;
  cameraDisconnectAlerts?: boolean;
  storageAlerts?: boolean;
  systemAlerts?: boolean;
  webhookEnabled?: boolean;
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
  timestamp: string;
  eventType: string;
  message: string;
  cameraId?: string | null;
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
