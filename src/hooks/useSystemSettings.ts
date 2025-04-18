
import { useState, useEffect } from "react";
import { SystemSettings, StorageType } from "@/types";
import { toast } from "@/components/ui/use-toast";

// Default settings
const defaultSettings: SystemSettings = {
  storageLocation: "/var/visionhub/recordings/",
  networkSubnet: "192.168.1.0/24",
  recordingFormat: "mp4",
  recordingQuality: "medium",
  motionDetectionEnabled: true,
  retentionDays: 30,
  storageType: "local",
  nasMounted: false
};

// In a real app, this would interact with a backend API
export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate loading settings from API
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // In a real app, this would fetch from an API
        const response = await fetch('/api/settings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        
        const data = await response.json();
        
        // Transform backend data to match our frontend types
        const transformedSettings: SystemSettings = {
          storageLocation: data.storage_location,
          networkSubnet: data.network_subnet,
          recordingFormat: data.recording_format as 'mp4' | 'mkv' | 'avi',
          recordingQuality: data.recording_quality as 'low' | 'medium' | 'high',
          motionDetectionEnabled: !!data.motion_detection_enabled,
          alertEmail: data.alert_email,
          alertWebhookUrl: data.alert_webhook_url,
          retentionDays: data.retention_days,
          storageType: (data.storage_type as StorageType) || 'local',
          nasPath: data.nas_path,
          nasUsername: data.nas_username,
          nasPassword: data.nas_password,
          nasMounted: !!data.nas_mounted
        };
        
        setSettings(transformedSettings);
      } catch (err) {
        console.error("Error loading settings:", err);
        setError("Failed to load system settings");
        // Fall back to default settings
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Validate NAS connection
  const validateNasConnection = async (nasSettings: {
    path: string;
    username?: string;
    password?: string;
  }) => {
    setValidating(true);
    
    try {
      const response = await fetch('/api/settings/nas/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nasSettings),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast({
          title: "Validation failed",
          description: data.error || "Could not connect to NAS",
          variant: "destructive",
        });
        return false;
      }
      
      toast({
        title: "Connection successful",
        description: "NAS path is accessible",
      });
      return true;
    } catch (err) {
      console.error("Error validating NAS:", err);
      toast({
        title: "Validation error",
        description: "Could not validate NAS connection",
        variant: "destructive",
      });
      return false;
    } finally {
      setValidating(false);
    }
  };

  // Save updated settings
  const saveSettings = async (updatedSettings: SystemSettings) => {
    setLoading(true);
    setError(null);
    
    try {
      // First validate NAS connection if that's the selected storage type
      if (updatedSettings.storageType === 'nas' && updatedSettings.nasPath) {
        const isValid = await validateNasConnection({
          path: updatedSettings.nasPath,
          username: updatedSettings.nasUsername,
          password: updatedSettings.nasPassword,
        });
        
        if (!isValid) {
          setError("Could not connect to NAS storage. Please check settings.");
          return null;
        }
      }
      
      // Transform to backend data format
      const backendData = {
        storage_location: updatedSettings.storageLocation,
        network_subnet: updatedSettings.networkSubnet,
        recording_format: updatedSettings.recordingFormat,
        recording_quality: updatedSettings.recordingQuality,
        motion_detection_enabled: updatedSettings.motionDetectionEnabled,
        alert_email: updatedSettings.alertEmail,
        alert_webhook_url: updatedSettings.alertWebhookUrl,
        retention_days: updatedSettings.retentionDays,
        storage_type: updatedSettings.storageType,
        nas_path: updatedSettings.nasPath,
        nas_username: updatedSettings.nasUsername,
        nas_password: updatedSettings.nasPassword
      };
      
      // In a real app, this would call an API
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      
      const data = await response.json();
      
      // Transform response back to our frontend types
      const savedSettings: SystemSettings = {
        ...updatedSettings,
        nasMounted: data.nas_mounted
      };
      
      setSettings(savedSettings);
      
      toast({
        title: "Settings saved",
        description: "System settings have been updated successfully"
      });
      
      return savedSettings;
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save system settings");
      
      toast({
        title: "Error",
        description: "Failed to save system settings",
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    settings,
    loading,
    validating,
    error,
    saveSettings,
    validateNasConnection
  };
}
