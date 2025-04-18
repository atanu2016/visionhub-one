
import { useState, useEffect } from "react";
import { SystemSettings } from "@/types";

// Default settings
const defaultSettings: SystemSettings = {
  storageLocation: "/var/visionhub/recordings/",
  networkSubnet: "192.168.1.0/24",
  recordingFormat: "mp4",
  recordingQuality: "medium",
  motionDetectionEnabled: true,
  retentionDays: 30
};

// In a real app, this would interact with a backend API
export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate loading settings from API
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // In a real app, this would fetch from an API
        // Simulating a delay to mimic API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // For now, just use our default settings
        setSettings(defaultSettings);
      } catch (err) {
        setError("Failed to load system settings");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Save updated settings
  const saveSettings = async (updatedSettings: SystemSettings) => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would call an API
      // Simulating a delay to mimic API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      setError("Failed to save system settings");
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    settings,
    loading,
    error,
    saveSettings
  };
}
