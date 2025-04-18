
import { useState, useEffect, useCallback } from "react";
import { SystemEvent } from "@/types";

// Sample data for initial state
const initialEvents: SystemEvent[] = [
  {
    id: "e1",
    timestamp: "2025-04-18T08:00:00.000Z",
    eventType: "system_started",
    message: "VisionHub One Sentinel system started",
    severity: "info"
  },
  {
    id: "e2",
    timestamp: "2025-04-18T08:30:15.000Z",
    eventType: "motion_detected",
    message: "Motion detected on Front Door camera",
    cameraId: "c1",
    severity: "info"
  },
  {
    id: "e3",
    timestamp: "2025-04-18T08:30:16.000Z",
    eventType: "recording_started",
    message: "Recording started on Front Door camera (trigger: motion)",
    cameraId: "c1",
    severity: "info"
  },
  {
    id: "e4",
    timestamp: "2025-04-18T09:15:00.000Z",
    eventType: "recording_started",
    message: "Recording started on Reception camera (trigger: scheduled)",
    cameraId: "c3",
    severity: "info"
  },
  {
    id: "e5",
    timestamp: "2025-04-18T10:05:22.000Z",
    eventType: "motion_detected",
    message: "Motion detected on Parking Lot camera",
    cameraId: "c2",
    severity: "info"
  },
  {
    id: "e6",
    timestamp: "2025-04-18T11:00:00.000Z",
    eventType: "camera_updated",
    message: "Camera Settings updated for Server Room camera",
    cameraId: "c4",
    severity: "info"
  },
  {
    id: "e7",
    timestamp: "2025-04-18T11:30:00.000Z",
    eventType: "recording_started",
    message: "Recording started on Server Room camera (trigger: manual)",
    cameraId: "c4",
    severity: "info"
  },
  {
    id: "e8",
    timestamp: "2025-04-18T11:45:12.000Z",
    eventType: "system_error",
    message: "Storage space running low (< 10% available)",
    severity: "warning"
  },
  {
    id: "e9",
    timestamp: "2025-04-18T12:45:33.000Z",
    eventType: "motion_detected",
    message: "Motion detected on Front Door camera",
    cameraId: "c1",
    severity: "info"
  },
  {
    id: "e10",
    timestamp: "2025-04-18T12:50:00.000Z",
    eventType: "camera_updated",
    message: "Motion sensitivity increased on Front Door camera",
    cameraId: "c1",
    severity: "info"
  }
];

// In a real app, this would interact with a backend API
export function useSystemEvents() {
  const [events, setEvents] = useState<SystemEvent[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would fetch from an API
      // Simulating a delay to mimic API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just use our initial data
      setEvents(initialEvents);
    } catch (err) {
      setError("Failed to load system events");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Simulate loading events from API on initial mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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

  // Add a new event (simulated)
  const addEvent = (eventData: Omit<SystemEvent, 'id'>) => {
    const newEvent: SystemEvent = {
      ...eventData,
      id: `e${events.length + 1}`
    };
    
    setEvents(prev => [newEvent, ...prev]);
    return newEvent;
  };

  // Add refetch method
  const refetch = async () => {
    return loadEvents();
  };

  return { 
    events,
    loading,
    error,
    getEventsByType,
    getEventsForCamera,
    getEventsBySeverity,
    getEventsByDateRange,
    addEvent,
    refetch  // Add the refetch method to the return value
  };
}
