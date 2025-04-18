
import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { useSystemEvents } from "@/hooks/useSystemEvents";
import { useCameras } from "@/hooks/useCameras";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Filter, AlertTriangle, Camera, Video, Settings, PlayCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Events = () => {
  const { events } = useSystemEvents();
  const { cameras } = useCameras();
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [cameraFilter, setCameraFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  
  // Filter events based on filters
  const filteredEvents = events.filter(event => {
    // Search term filter
    const matchesSearch = !searchTerm || event.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date range filter
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(event.timestamp) >= dateFrom;
    }
    if (dateTo) {
      // Add one day to dateTo to include the full day
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      matchesDate = matchesDate && new Date(event.timestamp) <= endDate;
    }
    
    // Camera filter
    const matchesCamera = cameraFilter === "all" || event.cameraId === cameraFilter;
    
    // Event type filter
    const matchesType = eventTypeFilter === "all" || event.eventType === eventTypeFilter;
    
    // Severity filter
    const matchesSeverity = severityFilter === "all" || event.severity === severityFilter;
    
    return matchesSearch && matchesDate && matchesCamera && matchesType && matchesSeverity;
  });
  
  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setCameraFilter("all");
    setEventTypeFilter("all");
    setSeverityFilter("all");
  };
  
  // Get icon for event type
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'motion_detected':
        return <AlertTriangle className="h-4 w-4 text-sentinel-status-warning" />;
      case 'camera_added':
      case 'camera_removed':
      case 'camera_updated':
        return <Camera className="h-4 w-4 text-sentinel-purple" />;
      case 'recording_started':
      case 'recording_stopped':
        return <Video className="h-4 w-4 text-sentinel-status-recording" />;
      case 'system_started':
      case 'system_error':
        return <Settings className="h-4 w-4 text-sentinel-blue" />;
      default:
        return <PlayCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <PageHeader 
        title="System Events" 
        description="View and filter event logs"
      />
      
      {/* Filter section */}
      <div className="bg-card border border-border rounded-md p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-auto flex-1">
            <Input
              placeholder="Search event messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Date range popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom && dateTo ? (
                  <>
                    {format(dateFrom, "MMM d, yyyy")} - {format(dateTo, "MMM d, yyyy")}
                  </>
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex p-2 gap-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">From</p>
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">To</p>
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Additional filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 items-start">
          <Select
            value={cameraFilter}
            onValueChange={setCameraFilter}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by camera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cameras</SelectItem>
              {cameras.map(camera => (
                <SelectItem key={camera.id} value={camera.id}>
                  {camera.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={eventTypeFilter}
            onValueChange={setEventTypeFilter}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="motion_detected">Motion Detected</SelectItem>
              <SelectItem value="recording_started">Recording Started</SelectItem>
              <SelectItem value="recording_stopped">Recording Stopped</SelectItem>
              <SelectItem value="camera_added">Camera Added</SelectItem>
              <SelectItem value="camera_removed">Camera Removed</SelectItem>
              <SelectItem value="camera_updated">Camera Updated</SelectItem>
              <SelectItem value="system_started">System Started</SelectItem>
              <SelectItem value="system_error">System Error</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={severityFilter}
            onValueChange={setSeverityFilter}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={resetFilters}
            className="w-full sm:w-auto sm:ml-auto"
          >
            <Filter className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
        </div>
      </div>
      
      {/* Events table */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="bg-muted p-3 grid grid-cols-12 text-sm font-medium">
          <div className="col-span-3">Timestamp</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-1">Severity</div>
          <div className="col-span-6">Message</div>
        </div>
        
        <div className="divide-y divide-border">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <div key={event.id} className="p-3 grid grid-cols-12 text-sm hover:bg-muted/50">
                <div className="col-span-3 text-muted-foreground">
                  {format(new Date(event.timestamp), "MMM d, yyyy HH:mm:ss")}
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  {getEventIcon(event.eventType)}
                  <span className="capitalize">{event.eventType.replace(/_/g, ' ')}</span>
                </div>
                <div className="col-span-1">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    event.severity === 'info' && "bg-sentinel-blue/10 text-sentinel-blue",
                    event.severity === 'warning' && "bg-sentinel-status-warning/10 text-sentinel-status-warning",
                    event.severity === 'error' && "bg-sentinel-status-danger/10 text-sentinel-status-danger",
                  )}>
                    {event.severity}
                  </span>
                </div>
                <div className="col-span-6">
                  {event.message}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>No events found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
