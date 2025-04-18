
import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { CameraCard } from "@/components/cameras/CameraCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCameras } from "@/hooks/useCameras";
import { useRecordings } from "@/hooks/useRecordings";
import { useSystemEvents } from "@/hooks/useSystemEvents";
import { Camera, CameraOff, FileVideo, AlertTriangle, Clock, Calendar, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera as CameraType } from "@/types";
import { CameraSettingsDialog } from "@/components/cameras/CameraSettingsDialog";
import { AddCameraDialog } from "@/components/cameras/AddCameraDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import websocketService from "@/services/websocketService";

const Dashboard = () => {
  const { 
    cameras, 
    loading: camerasLoading, 
    updateCamera, 
    deleteCamera, 
    toggleRecording, 
    discoverCameras,
    addCamera,
    refetch: refetchCameras
  } = useCameras();
  
  const { recordings, refetch: refetchRecordings } = useRecordings();
  const { events, refetch: refetchEvents } = useSystemEvents();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  
  // Check WebSocket connection status
  useEffect(() => {
    const checkConnection = () => {
      setWebsocketConnected(websocketService.isConnected());
    };
    
    // Check initial status
    checkConnection();
    
    // Set up interval to check status periodically
    const interval = setInterval(checkConnection, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  // State for camera settings dialog
  const [selectedCamera, setSelectedCamera] = useState<CameraType | undefined>(undefined);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  
  // Calculate dashboard stats
  const activeCameras = cameras.filter(camera => camera.status === 'active').length;
  const recordingCameras = cameras.filter(camera => camera.isRecording).length;
  const offlineCameras = cameras.filter(camera => camera.status === 'offline').length;
  
  // Get recent events and recordings
  const recentEvents = events.slice(0, 5);
  const recentRecordings = recordings.slice(0, 4);
  
  // Handle camera settings
  const handleCameraSettings = (camera: CameraType) => {
    setSelectedCamera(camera);
    setSettingsDialogOpen(true);
  };
  
  // Handle toggle recording
  const handleToggleRecording = (camera: CameraType) => {
    toggleRecording(camera.id);
  };
  
  // Handle refresh data
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchCameras(),
        refetchRecordings(),
        refetchEvents()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // If WebSocket is disconnected, show reconnect button
  const reconnectWebsocket = () => {
    websocketService.connect();
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <PageHeader 
        title="Dashboard" 
        description="System overview and status"
      >
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
          
          <AddCameraDialog 
            onAddCamera={addCamera}
            onDiscoverCameras={discoverCameras}
          />
        </div>
      </PageHeader>
      
      {/* Connection warning */}
      {!websocketConnected && (
        <div className="bg-amber-100 dark:bg-amber-900 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-3 rounded-md flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Live updates are currently unavailable. Camera status may not be current.</span>
          </div>
          <Button size="sm" variant="outline" onClick={reconnectWebsocket}>Reconnect</Button>
        </div>
      )}
      
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard 
          title="Active Cameras" 
          value={activeCameras} 
          icon={Camera} 
          status="active"
        />
        <StatusCard 
          title="Recording" 
          value={recordingCameras} 
          icon={FileVideo} 
          status="recording"
        />
        <StatusCard 
          title="Offline Cameras" 
          value={offlineCameras} 
          icon={CameraOff} 
          status="danger"
        />
        <StatusCard 
          title="Recent Events" 
          value={events.length} 
          icon={AlertTriangle} 
          status="warning"
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Camera Preview</h2>
          {camerasLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className="rounded-lg border border-border overflow-hidden bg-card flex flex-col shadow-sm animate-pulse"
                >
                  <div className="aspect-video bg-muted"></div>
                  <div className="p-3 flex items-center justify-between">
                    <div className="w-24 h-4 bg-muted rounded"></div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-8 bg-muted rounded"></div>
                      <div className="w-8 h-8 bg-muted rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : cameras.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cameras.slice(0, 4).map((camera) => (
                <CameraCard
                  key={camera.id}
                  camera={camera}
                  onSettings={handleCameraSettings}
                  onToggleRecording={handleToggleRecording}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border border-dashed rounded-md">
              <Camera className="h-12 w-12 mb-2 opacity-20" />
              <p className="font-medium">No cameras found</p>
              <p className="text-sm">Add cameras to start monitoring</p>
            </div>
          )}
        </div>
        
        {/* Side Panel */}
        <div className="space-y-6">
          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-sentinel-purple" />
                Recent Events
              </CardTitle>
              <CardDescription>Latest system activities</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[320px] pr-4">
                {events.length > 0 ? (
                  <div className="space-y-4">
                    {recentEvents.map((event) => (
                      <div key={event.id} className="flex border-l-4 pl-3 -ml-3 py-1 space-y-1 animate-fade-in" 
                        style={{ 
                          borderColor: 
                            event.severity === 'error' ? 'var(--destructive)' : 
                            event.severity === 'warning' ? 'hsl(var(--warning))' : 
                            'var(--border)'
                        }}
                      >
                        <div className="w-full">
                          <p className="text-sm font-medium">{event.message}</p>
                          <div className="flex justify-between items-center text-muted-foreground text-xs">
                            <span>{format(new Date(event.timestamp), "HH:mm:ss")}</span>
                            <span className="capitalize">{event.eventType.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mb-2 opacity-20" />
                    <p>No events recorded</p>
                    <p className="text-sm">Events will appear here as they occur</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Recent Recordings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileVideo className="h-5 w-5 text-sentinel-purple" />
                Recent Recordings
              </CardTitle>
              <CardDescription>Latest camera recordings</CardDescription>
            </CardHeader>
            <CardContent>
              {recordings.length > 0 ? (
                <div className="space-y-3">
                  {recentRecordings.map((recording) => (
                    <div key={recording.id} className="flex items-center gap-3 animate-fade-in">
                      <div className="h-16 w-24 bg-black rounded overflow-hidden">
                        {recording.thumbnail ? (
                          <img 
                            src={recording.thumbnail}
                            alt={`Recording from ${recording.cameraName}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted">
                            <FileVideo className="h-6 w-6 opacity-50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{recording.cameraName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(recording.startTime), "MMM d, HH:mm:ss")}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          Trigger: {recording.triggerType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileVideo className="h-12 w-12 mb-2 opacity-20" />
                  <p>No recordings available</p>
                  <p className="text-sm">Recordings will appear here when cameras record</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Camera Settings Dialog */}
      <CameraSettingsDialog
        camera={selectedCamera}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onSave={updateCamera}
        onDelete={deleteCamera}
      />
    </div>
  );
};

export default Dashboard;
