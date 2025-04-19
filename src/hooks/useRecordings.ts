
import { useState } from "react";
import { RecordingEvent } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

async function fetchRecordings(): Promise<RecordingEvent[]> {
  const response = await fetch('/api/recordings');
  if (!response.ok) {
    throw new Error('Failed to fetch recordings');
  }
  return response.json();
}

async function deleteRecording(recordingId: string): Promise<boolean> {
  const response = await fetch(`/api/recordings/${recordingId}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete recording');
  }
  
  return true;
}

export function useRecordings() {
  const queryClient = useQueryClient();
  
  const { data: recordings = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['recordings'],
    queryFn: fetchRecordings,
    staleTime: 30000, // 30 seconds
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteRecording,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      toast({
        title: "Recording deleted",
        description: "The recording has been successfully removed"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete recording: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  });

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

  return { 
    recordings,
    loading,
    error: error instanceof Error ? error.message : null,
    getRecordingsForCamera,
    getRecordingsByDateRange,
    deleteRecording: (id: string) => deleteMutation.mutate(id),
    refetch
  };
}
