
import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { CameraCard } from "@/components/cameras/CameraCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCameras } from "@/hooks/useCameras";
import { useRecordings } from "@/hooks/useRecordings";
import { useSystemEvents } from "@/hooks/useSystemEvents";
import { Camera, CameraOff, FileVideo, AlertTriangle, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera as CameraType } from "@/types";
import { CameraSettingsDialog } from "@/components/cameras/CameraSettingsDialog";
import { AddCameraDialog } from "@/components/cameras/AddCameraDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

const Dashboard = () => {
  const { cameras, loading: camerasLoading, updateCamera, deleteCamera, toggleRecording, discoverCameras } = useCameras();
  const { recordings } = useRecordings();
  const { events } = useSystemEvents();
  
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

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <PageHeader 
        title="Dashboard" 
        description="System overview and status"
      >
        <AddCameraDialog 
          onAddCamera={(cameraData) => console.log("Add camera:", cameraData)}
          onDiscoverCameras={discoverCameras}
        />
      </PageHeader>
      
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
              <div className="space-y-3">
                {recentRecordings.map((recording) => (
                  <div key={recording.id} className="flex items-center gap-3 animate-fade-in">
                    <div className="h-16 w-24 bg-black rounded overflow-hidden">
                      <img 
                        src={recording.thumbnail}
                        alt={`Recording from ${recording.cameraName}`}
                        className="h-full w-full object-cover"
                      />
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
