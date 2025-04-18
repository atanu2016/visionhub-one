
import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CameraListItem } from "@/components/cameras/CameraListItem";
import { Camera as CameraType } from "@/types";
import { useCameras } from "@/hooks/useCameras";
import { CameraSettingsDialog } from "@/components/cameras/CameraSettingsDialog";
import { AddCameraDialog } from "@/components/cameras/AddCameraDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const CameraList = () => {
  const { cameras, updateCamera, deleteCamera, toggleRecording, discoverCameras, addCamera, loading, refetch } = useCameras();
  
  // State for camera settings dialog
  const [selectedCamera, setSelectedCamera] = useState<CameraType | undefined>(undefined);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  
  // State for filtering cameras
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <PageHeader 
        title="Camera List" 
        description="View and manage your surveillance cameras"
      >
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh cameras"
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
      
      {/* Camera List */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="py-3 px-4 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  <div>
                    <div className="h-4 w-40 bg-muted rounded mb-2"></div>
                    <div className="h-3 w-24 bg-muted rounded"></div>
                  </div>
                </div>
                
                <div className="w-16 h-4 bg-muted rounded"></div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-muted rounded"></div>
                  <div className="w-8 h-8 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCameras.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredCameras.map((camera) => (
              <CameraListItem
                key={camera.id}
                camera={camera}
                onSettings={handleCameraSettings}
                onToggleRecording={handleToggleRecording}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Camera className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No cameras found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new camera</p>
          </div>
        )}
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

export default CameraList;
