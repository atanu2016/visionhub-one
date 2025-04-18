
import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CameraCard } from "@/components/cameras/CameraCard";
import { Camera as CameraType } from "@/types";
import { useCameras } from "@/hooks/useCameras";
import { CameraSettingsDialog } from "@/components/cameras/CameraSettingsDialog";
import { AddCameraDialog } from "@/components/cameras/AddCameraDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const CameraGrid = () => {
  const { cameras, updateCamera, deleteCamera, toggleRecording, discoverCameras, addCamera } = useCameras();
  
  // State for camera settings dialog
  const [selectedCamera, setSelectedCamera] = useState<CameraType | undefined>(undefined);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  
  // State for filtering cameras
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Filter cameras based on search term and status
  const filteredCameras = cameras.filter(camera => {
    const matchesSearch = camera.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         camera.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         camera.ipAddress.includes(searchTerm);
                         
    const matchesStatus = statusFilter === "all" || camera.status === statusFilter ||
                         (statusFilter === "recording" && camera.isRecording);
                         
    return matchesSearch && matchesStatus;
  });
  
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
        title="Camera Grid" 
        description="View all camera feeds in a grid layout"
      >
        <AddCameraDialog 
          onAddCamera={addCamera}
          onDiscoverCameras={discoverCameras}
        />
      </PageHeader>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="w-full sm:w-auto flex-1">
          <Label htmlFor="search" className="text-sm mb-2 block">Search Cameras</Label>
          <Input
            id="search"
            placeholder="Search by name, location or IP"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Label htmlFor="status" className="text-sm mb-2 block">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cameras</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="recording">Recording</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="danger">Error</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Camera Grid */}
      {filteredCameras.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCameras.map((camera) => (
            <CameraCard
              key={camera.id}
              camera={camera}
              onSettings={handleCameraSettings}
              onToggleRecording={handleToggleRecording}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No cameras found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new camera</p>
        </div>
      )}
      
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

export default CameraGrid;
