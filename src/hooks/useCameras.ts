
import { useState, useEffect } from "react";
import { Camera } from "@/types";
import { v4 as uuidv4 } from 'uuid';

// Sample data for initial state
const initialCameras: Camera[] = [
  {
    id: "c1",
    name: "Front Door",
    ipAddress: "192.168.1.100",
    streamUrl: "rtsp://192.168.1.100:554/stream1",
    onvifPort: 80,
    username: "admin",
    password: "admin",
    status: "active",
    motionDetection: true,
    motionSensitivity: 70,
    location: "Front Entrance",
    manufacturer: "Hikvision",
    model: "DS-2CD2185FWD-I",
    lastUpdated: new Date().toISOString(),
    isRecording: false
  },
  {
    id: "c2",
    name: "Parking Lot",
    ipAddress: "192.168.1.101",
    streamUrl: "rtsp://192.168.1.101:554/stream1",
    onvifPort: 80,
    username: "admin",
    password: "admin",
    status: "idle",
    motionDetection: false,
    motionSensitivity: 50,
    location: "North Parking",
    manufacturer: "Dahua",
    model: "IPC-HDW5231R-ZE",
    lastUpdated: new Date().toISOString(),
    isRecording: false
  },
  {
    id: "c3",
    name: "Reception",
    ipAddress: "192.168.1.102",
    streamUrl: "rtsp://192.168.1.102:554/stream1",
    onvifPort: 80,
    username: "admin",
    password: "admin",
    status: "active",
    motionDetection: true,
    motionSensitivity: 85,
    location: "Main Building",
    lastUpdated: new Date().toISOString(),
    isRecording: true
  },
  {
    id: "c4",
    name: "Server Room",
    ipAddress: "192.168.1.103",
    streamUrl: "rtsp://192.168.1.103:554/stream1",
    onvifPort: 80,
    username: "admin",
    password: "admin",
    status: "warning",
    motionDetection: true,
    motionSensitivity: 90,
    location: "IT Department",
    lastUpdated: new Date().toISOString(),
    isRecording: false
  }
];

// In a real app, this would interact with a backend API
export function useCameras() {
  const [cameras, setCameras] = useState<Camera[]>(initialCameras);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate loading cameras from API
  useEffect(() => {
    const loadCameras = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // In a real app, this would fetch from an API
        // Simulating a delay to mimic API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For now, just use our initial data
        setCameras(initialCameras);
      } catch (err) {
        setError("Failed to load cameras");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadCameras();
  }, []);

  // Add a new camera
  const addCamera = async (cameraData: Omit<Camera, 'id'>) => {
    try {
      const newCamera: Camera = {
        ...cameraData,
        id: uuidv4(),
        lastUpdated: new Date().toISOString()
      };
      
      // In a real app, this would call an API
      // Simulating a delay to mimic API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCameras(prev => [...prev, newCamera]);
      return newCamera;
    } catch (err) {
      setError("Failed to add camera");
      console.error(err);
      throw err;
    }
  };

  // Update an existing camera
  const updateCamera = async (updatedCamera: Camera) => {
    try {
      // In a real app, this would call an API
      // Simulating a delay to mimic API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCameras(prev => 
        prev.map(camera => 
          camera.id === updatedCamera.id 
            ? { ...updatedCamera, lastUpdated: new Date().toISOString() } 
            : camera
        )
      );
      
      return updatedCamera;
    } catch (err) {
      setError("Failed to update camera");
      console.error(err);
      throw err;
    }
  };

  // Delete a camera
  const deleteCamera = async (cameraId: string) => {
    try {
      // In a real app, this would call an API
      // Simulating a delay to mimic API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCameras(prev => prev.filter(camera => camera.id !== cameraId));
    } catch (err) {
      setError("Failed to delete camera");
      console.error(err);
      throw err;
    }
  };

  // Toggle recording status
  const toggleRecording = async (cameraId: string) => {
    try {
      // In a real app, this would call an API to start/stop recording
      // Simulating a delay to mimic API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setCameras(prev => 
        prev.map(camera => 
          camera.id === cameraId 
            ? { ...camera, isRecording: !camera.isRecording, lastUpdated: new Date().toISOString() } 
            : camera
        )
      );
    } catch (err) {
      setError("Failed to toggle recording");
      console.error(err);
      throw err;
    }
  };

  // Discover cameras on network (simulated)
  const discoverCameras = async (subnet: string) => {
    try {
      setLoading(true);
      // In a real app, this would scan the network and find ONVIF devices
      // Simulating a delay to mimic network scan
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Return simulated discovered cameras
      return [
        {
          name: "Conference Room",
          ipAddress: "192.168.1.105",
          port: 80,
          manufacturer: "Axis",
          model: "P3245-LVE"
        },
        {
          name: "Back Entrance",
          ipAddress: "192.168.1.106",
          port: 80,
          manufacturer: "Hikvision",
          model: "DS-2CD2043G0-I"
        }
      ];
    } catch (err) {
      setError("Failed to discover cameras");
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    cameras,
    loading,
    error,
    addCamera,
    updateCamera,
    deleteCamera,
    toggleRecording,
    discoverCameras
  };
}
