
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, Search, Loader2, Check, X } from "lucide-react";
import { Camera as CameraType } from "@/types";
import * as cameraService from "@/services/cameraService";

// Empty camera template
const emptyCameraTemplate: Omit<CameraType, 'id'> = {
  name: "",
  ipAddress: "",
  streamUrl: "",
  onvifPort: 80,
  username: "",
  password: "",
  status: "idle",
  motionDetection: false,
  motionSensitivity: 50,
  location: "",
  lastUpdated: new Date().toISOString(),
  isRecording: false
};

interface AddCameraDialogProps {
  onAddCamera: (camera: Omit<CameraType, 'id'>) => Promise<CameraType | null>;
  onDiscoverCameras: (subnet: string) => Promise<any[]>;
}

export function AddCameraDialog({
  onAddCamera,
  onDiscoverCameras,
}: AddCameraDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [formData, setFormData] = useState<Omit<CameraType, 'id'>>({ ...emptyCameraTemplate });
  const [subnet, setSubnet] = useState("192.168.1.0/24");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredCameras, setDiscoveredCameras] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success?: boolean;
    deviceInfo?: any;
    streamUrl?: string;
    ptzCapabilities?: boolean;
    error?: string;
  } | null>(null);

  // Clear form and validation state when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setFormData({ ...emptyCameraTemplate });
      setValidationResult(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const result = await onAddCamera(formData);
      if (result) {
        setFormData({ ...emptyCameraTemplate });
        setOpen(false);
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Handle form field changes
  const handleChange = (field: keyof Omit<CameraType, 'id'>, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });
    
    // Clear validation when editing connection details
    if (['ipAddress', 'onvifPort', 'username', 'password'].includes(field)) {
      setValidationResult(null);
    }
  };

  // Handle camera validation
  const handleValidateCamera = async () => {
    if (!formData.ipAddress) return;
    
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      const result = await cameraService.validateOnvifCamera({
        ipAddress: formData.ipAddress,
        onvifPort: formData.onvifPort,
        username: formData.username,
        password: formData.password
      });
      
      setValidationResult(result);
      
      // If validation successful and we got a stream URL, update the form
      if (result.success && result.streamUrl) {
        setFormData(prev => ({
          ...prev,
          streamUrl: result.streamUrl || prev.streamUrl
        }));
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Handle camera discovery
  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const cameras = await onDiscoverCameras(subnet);
      setDiscoveredCameras(cameras || []);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Handle selecting a discovered camera
  const handleSelectDiscoveredCamera = (camera: any) => {
    setFormData({
      ...emptyCameraTemplate,
      name: camera.name || `Camera at ${camera.ipAddress}`,
      ipAddress: camera.ipAddress,
      onvifPort: camera.port,
      streamUrl: camera.streamUrl || `rtsp://${camera.ipAddress}/stream1`,
      manufacturer: camera.manufacturer,
      model: camera.model,
      lastUpdated: new Date().toISOString(),
    });
    setActiveTab("manual");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Camera
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-sentinel-purple" />
            <DialogTitle>Add New Camera</DialogTitle>
          </div>
          <DialogDescription>
            Add a new camera manually or discover cameras on your network.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="manual">Manual Setup</TabsTrigger>
            <TabsTrigger value="discover">Discover Cameras</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Camera Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleChange("location", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ipAddress">IP Address</Label>
                    <Input
                      id="ipAddress"
                      value={formData.ipAddress}
                      onChange={(e) => handleChange("ipAddress", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="onvifPort">ONVIF Port</Label>
                    <Input
                      id="onvifPort"
                      type="number"
                      value={formData.onvifPort}
                      onChange={(e) =>
                        handleChange("onvifPort", parseInt(e.target.value, 10))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="validate">Connection Settings</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleValidateCamera}
                      disabled={isValidating || !formData.ipAddress}
                    >
                      {isValidating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4 mr-2" />
                      )}
                      Validate Connection
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => handleChange("username", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {validationResult !== null && (
                    <div className={`p-3 border rounded-md mt-2 ${validationResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                      <div className="flex items-start gap-2">
                        {validationResult.success ? (
                          <Check className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div>
                          <p className={`font-medium ${validationResult.success ? 'text-green-700' : 'text-red-700'}`}>
                            {validationResult.success ? 'Camera connection successful!' : 'Camera connection failed'}
                          </p>
                          {validationResult.success ? (
                            <div className="text-sm text-green-700 mt-1">
                              {validationResult.deviceInfo && (
                                <p>
                                  {validationResult.deviceInfo.manufacturer} {validationResult.deviceInfo.model}
                                </p>
                              )}
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                                  ONVIF Compatible
                                </Badge>
                                {validationResult.ptzCapabilities && (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                    PTZ Support
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-red-700 mt-1">
                              {validationResult.error || "Unable to connect to camera. Please check the IP address, port, and credentials."}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="streamUrl">Stream URL</Label>
                  <Input
                    id="streamUrl"
                    value={formData.streamUrl}
                    onChange={(e) => handleChange("streamUrl", e.target.value)}
                    required
                    placeholder="rtsp://username:password@camera-ip:port/stream"
                  />
                  <p className="text-xs text-muted-foreground">
                    {validationResult?.success ? "Stream URL auto-detected from camera" : "RTSP URL for the camera stream"}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="motionDetection"
                    checked={formData.motionDetection}
                    onCheckedChange={(checked) =>
                      handleChange("motionDetection", checked)
                    }
                  />
                  <Label htmlFor="motionDetection">Enable Motion Detection</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Camera"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="discover">
            <div className="grid gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subnet">Network Subnet</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="subnet"
                      value={subnet}
                      onChange={(e) => setSubnet(e.target.value)}
                      placeholder="192.168.1.0/24"
                    />
                    <Button 
                      type="button" 
                      onClick={handleDiscover}
                      disabled={isDiscovering}
                    >
                      {isDiscovering ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        "Scan"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a subnet in CIDR notation (e.g. 192.168.1.0/24)
                  </p>
                </div>

                {isDiscovering ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-sentinel-purple" />
                      <p className="text-sm text-muted-foreground">Scanning network for cameras...</p>
                    </div>
                  </div>
                ) : discoveredCameras.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-muted py-2 px-4 text-sm font-medium">
                      Discovered Cameras
                    </div>
                    <div className="divide-y">
                      {discoveredCameras.map((camera, index) => (
                        <div key={index} className="flex items-center justify-between py-3 px-4 hover:bg-muted/50">
                          <div>
                            <p className="font-medium">{camera.name || camera.ipAddress}</p>
                            <p className="text-sm text-muted-foreground">
                              {camera.manufacturer} {camera.model} - {camera.ipAddress}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSelectDiscoveredCamera(camera)}
                          >
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mb-2 opacity-20" />
                    <p>No cameras discovered yet</p>
                    <p className="text-sm">Click "Scan" to search for cameras</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
