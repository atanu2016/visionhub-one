
import { useState, useEffect } from "react";
import { Camera } from "@/types";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import websocketService from "@/services/websocketService";
import * as cameraService from "@/services/cameraService";

export function useCameras() {
  const queryClient = useQueryClient();
  
  // Connect to WebSocket when hook is used
  useEffect(() => {
    websocketService.connect();
    
    // Listen for camera status updates
    const handleStatusUpdate = (data: any) => {
      queryClient.setQueryData(
        ['cameras'], 
        (oldData: Camera[] | undefined) => {
          if (!oldData) return oldData;
          
          return oldData.map(cam => 
            cam.id === data.id ? { ...cam, status: data.status, isRecording: data.isRecording } : cam
          );
        }
      );
    };
    
    websocketService.on('camera_status', handleStatusUpdate);
    
    return () => {
      websocketService.off('camera_status', handleStatusUpdate);
    };
  }, [queryClient]);
  
  // Query for cameras
  const { 
    data: cameras = [], 
    isLoading: loading, 
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['cameras'],
    queryFn: cameraService.getCameras,
    staleTime: 30000, // 30 seconds
  });
  
  const error = queryError ? (queryError instanceof Error ? queryError.message : "Unknown error") : null;
  
  // Mutations
  const addCameraMutation = useMutation({
    mutationFn: cameraService.addCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
  
  const updateCameraMutation = useMutation({
    mutationFn: cameraService.updateCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
  
  const deleteCameraMutation = useMutation({
    mutationFn: cameraService.deleteCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
  
  const toggleRecordingMutation = useMutation({
    mutationFn: cameraService.toggleCameraRecording,
    onSuccess: (_, cameraId) => {
      // Optimistically update the state
      queryClient.setQueryData(['cameras'], (oldData: Camera[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map(camera => 
          camera.id === cameraId ? 
            { ...camera, isRecording: !camera.isRecording } : 
            camera
        );
      });
    },
  });
  
  // Handler functions
  const addCamera = async (cameraData: Omit<Camera, 'id'>) => {
    return addCameraMutation.mutateAsync(cameraData);
  };
  
  const updateCamera = async (camera: Camera) => {
    return updateCameraMutation.mutateAsync(camera);
  };
  
  const deleteCamera = async (cameraId: string) => {
    return deleteCameraMutation.mutateAsync(cameraId);
  };
  
  const toggleRecording = async (cameraId: string) => {
    return toggleRecordingMutation.mutateAsync(cameraId);
  };
  
  const discoverCameras = async (subnet: string = "192.168.1.0/24") => {
    return await cameraService.discoverCameras(subnet);
  };

  return { 
    cameras,
    loading,
    error,
    addCamera,
    updateCamera,
    deleteCamera,
    toggleRecording,
    discoverCameras,
    refetch
  };
}
