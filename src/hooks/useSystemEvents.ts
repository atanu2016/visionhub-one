
import { useState, useEffect, useCallback } from "react";
import { SystemEvent } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// Function to fetch events from the API
async function fetchEvents(params?: {
  eventType?: string;
  cameraId?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<SystemEvent[]> {
  // Construct query parameters
  const queryParams = new URLSearchParams();
  
  if (params?.eventType) {
    queryParams.append('eventType', params.eventType);
  }
  
  if (params?.cameraId) {
    queryParams.append('cameraId', params.cameraId);
  }
  
  if (params?.severity) {
    queryParams.append('severity', params.severity);
  }
  
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate.toISOString());
  }
  
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate.toISOString());
  }
  
  // Make the API call
  const queryString = queryParams.toString();
  const url = `/api/events${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }
  
  return await response.json();
}

// Function to create a new event
async function createEvent(eventData: Omit<SystemEvent, 'id' | 'timestamp'>): Promise<SystemEvent> {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create event');
  }
  
  return await response.json();
}

export function useSystemEvents(filters?: {
  eventType?: string;
  cameraId?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const queryClient = useQueryClient();
  
  // Use React Query to fetch events
  const { 
    data: events = [], 
    isLoading: loading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => fetchEvents(filters),
    staleTime: 30000, // 30 seconds
  });

  // Mutation for adding events
  const addEventMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      // Invalidate events query to refetch
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  });

  // Filter events by type
  const getEventsByType = (eventType: SystemEvent['eventType']) => {
    return events.filter(event => event.eventType === eventType);
  };

  // Filter events by camera ID
  const getEventsForCamera = (cameraId: string) => {
    return events.filter(event => event.cameraId === cameraId);
  };

  // Filter events by severity
  const getEventsBySeverity = (severity: SystemEvent['severity']) => {
    return events.filter(event => event.severity === severity);
  };

  // Filter events by date range
  const getEventsByDateRange = (startDate: Date, endDate: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    });
  };

  // Add a new event
  const addEvent = (eventData: Omit<SystemEvent, 'id' | 'timestamp'>) => {
    return addEventMutation.mutate(eventData);
  };

  return { 
    events,
    loading,
    error: error instanceof Error ? error.message : null,
    getEventsByType,
    getEventsForCamera,
    getEventsBySeverity,
    getEventsByDateRange,
    addEvent,
    refetch
  };
}
