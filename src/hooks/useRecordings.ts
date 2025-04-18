
import { useState, useEffect, useCallback } from "react";
import { RecordingEvent } from "@/types";

// Sample data for initial state
const initialRecordings: RecordingEvent[] = [
  {
    id: "r1",
    cameraId: "c1",
    cameraName: "Front Door",
    startTime: "2025-04-18T08:30:00.000Z",
    endTime: "2025-04-18T08:35:00.000Z",
    duration: 300,
    triggerType: "motion",
    fileSize: 15728640, // 15MB
    filePath: "/var/visionhub/recordings/front_door_20250418_083000.mp4",
    thumbnail: "https://source.unsplash.com/random/400x300?security,camera&sig=1"
  },
  {
    id: "r2",
    cameraId: "c3",
    cameraName: "Reception",
    startTime: "2025-04-18T09:15:00.000Z",
    endTime: "2025-04-18T09:20:00.000Z",
    duration: 300,
    triggerType: "scheduled",
    fileSize: 20971520, // 20MB
    filePath: "/var/visionhub/recordings/reception_20250418_091500.mp4",
    thumbnail: "https://source.unsplash.com/random/400x300?security,camera&sig=2"
  },
  {
    id: "r3",
    cameraId: "c2",
    cameraName: "Parking Lot",
    startTime: "2025-04-18T10:05:00.000Z",
    endTime: "2025-04-18T10:15:00.000Z",
    duration: 600,
    triggerType: "motion",
    fileSize: 31457280, // 30MB
    filePath: "/var/visionhub/recordings/parking_lot_20250418_100500.mp4",
    thumbnail: "https://source.unsplash.com/random/400x300?security,camera&sig=3"
  },
  {
    id: "r4",
    cameraId: "c4",
    cameraName: "Server Room",
    startTime: "2025-04-18T11:30:00.000Z",
    endTime: "2025-04-18T11:40:00.000Z",
    duration: 600,
    triggerType: "manual",
    fileSize: 26214400, // 25MB
    filePath: "/var/visionhub/recordings/server_room_20250418_113000.mp4",
    thumbnail: "https://source.unsplash.com/random/400x300?security,camera&sig=4"
  },
  {
    id: "r5",
    cameraId: "c1",
    cameraName: "Front Door",
    startTime: "2025-04-18T12:45:00.000Z",
    triggerType: "motion",
    filePath: "/var/visionhub/recordings/front_door_20250418_124500.mp4",
    thumbnail: "https://source.unsplash.com/random/400x300?security,camera&sig=5"
  }
];

// In a real app, this would interact with a backend API
export function useRecordings() {
  const [recordings, setRecordings] = useState<RecordingEvent[]>(initialRecordings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would fetch from an API
      // Simulating a delay to mimic API call
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // For now, just use our initial data
      setRecordings(initialRecordings);
    } catch (err) {
      setError("Failed to load recordings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Simulate loading recordings from API on initial mount
  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Filter recordings by camera ID
  const getRecordingsForCamera = (cameraId: string) => {
    return recordings.filter(recording => recording.cameraId === cameraId);
  };

  // Filter recordings by date range
  const getRecordingsByDateRange = (startDate: Date, endDate: Date) => {
    return recordings.filter(recording => {
      const recordingStartDate = new Date(recording.startTime);
      return recordingStartDate >= startDate && recordingStartDate <= endDate;
    });
  };

  // Delete a recording
  const deleteRecording = async (recordingId: string) => {
    try {
      // In a real app, this would call an API
      // Simulating a delay to mimic API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setRecordings(prev => prev.filter(recording => recording.id !== recordingId));
    } catch (err) {
      setError("Failed to delete recording");
      console.error(err);
      throw err;
    }
  };

  // Export recording (simulated)
  const exportRecording = async (recordingId: string) => {
    try {
      // In a real app, this would generate a download URL or trigger a download
      // Simulating a delay to mimic processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const recording = recordings.find(r => r.id === recordingId);
      if (!recording) {
        throw new Error("Recording not found");
      }
      
      // Return simulated download URL
      return { 
        downloadUrl: `/api/recordings/download/${recordingId}`,
        filename: recording.filePath.split('/').pop() || `recording_${recordingId}.mp4`
      };
    } catch (err) {
      setError("Failed to export recording");
      console.error(err);
      throw err;
    }
  };

  // Add refetch method
  const refetch = async () => {
    return loadRecordings();
  };

  return { 
    recordings,
    loading,
    error,
    getRecordingsForCamera,
    getRecordingsByDateRange,
    deleteRecording,
    exportRecording,
    refetch  // Add the refetch method to the return value
  };
}
