
import { Camera } from "@/types";
import { toast } from "@/hooks/use-toast";

const API_BASE_URL = '/api';

export async function discoverCameras(subnet: string): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/cameras/discover?subnet=${encodeURIComponent(subnet)}`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    toast({
      title: "Discovery Failed",
      description: `Failed to discover cameras: ${error instanceof Error ? error.message : "Unknown error"}`,
      variant: "destructive",
    });
    console.error('Error discovering cameras:', error);
    return [];
  }
}

export async function addCamera(cameraData: Omit<Camera, 'id'>): Promise<Camera | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/cameras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cameraData),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const camera = await response.json();
    toast({
      title: "Camera Added",
      description: `${camera.name} has been successfully added.`,
    });
    return camera;
  } catch (error) {
    toast({
      title: "Failed to Add Camera",
      description: `${error instanceof Error ? error.message : "Unknown error"}`,
      variant: "destructive",
    });
    console.error('Error adding camera:', error);
    return null;
  }
}

export async function updateCamera(camera: Camera): Promise<Camera | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/cameras/${camera.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(camera),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const updatedCamera = await response.json();
    toast({
      title: "Camera Updated",
      description: `${updatedCamera.name} has been successfully updated.`,
    });
    return updatedCamera;
  } catch (error) {
    toast({
      title: "Failed to Update Camera",
      description: `${error instanceof Error ? error.message : "Unknown error"}`,
      variant: "destructive",
    });
    console.error('Error updating camera:', error);
    return null;
  }
}

export async function deleteCamera(cameraId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/cameras/${cameraId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    toast({
      title: "Camera Deleted",
      description: "The camera has been successfully removed.",
    });
    return true;
  } catch (error) {
    toast({
      title: "Failed to Delete Camera",
      description: `${error instanceof Error ? error.message : "Unknown error"}`,
      variant: "destructive",
    });
    console.error('Error deleting camera:', error);
    return false;
  }
}

export async function toggleCameraRecording(cameraId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/cameras/${cameraId}/recording`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    toast({
      title: "Failed to Toggle Recording",
      description: `${error instanceof Error ? error.message : "Unknown error"}`,
      variant: "destructive",
    });
    console.error('Error toggling recording:', error);
    return false;
  }
}

export async function getCameras(): Promise<Camera[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/cameras`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching cameras:', error);
    return [];
  }
}

export async function validateOnvifCamera(cameraData: {
  ipAddress: string;
  onvifPort: number;
  username: string;
  password: string;
}): Promise<{
  success: boolean;
  deviceInfo?: any;
  streamUrl?: string;
  ptzCapabilities?: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/cameras/onvif/probe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cameraData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    toast({
      title: "Camera Validation Failed",
      description: `${error instanceof Error ? error.message : "Unknown error"}`,
      variant: "destructive",
    });
    console.error('Error validating camera:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
