
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

export interface SystemSettings {
  storageLocation: string;
  networkSubnet: string;
  recordingFormat: 'mp4' | 'mkv' | 'avi';
  recordingQuality: 'low' | 'medium' | 'high';
  motionDetectionEnabled: boolean;
  alertEmail?: string;
  alertWebhookUrl?: string;
  retentionDays: number;
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
  eventType: 'camera_added' | 'camera_removed' | 'camera_updated' | 'motion_detected' | 'recording_started' | 'recording_stopped' | 'system_started' | 'system_error';
  message: string;
  cameraId?: string;
  severity: 'info' | 'warning' | 'error';
}
