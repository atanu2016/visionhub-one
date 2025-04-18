
import React from "react";
import { Camera as CameraType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface CameraSettingsDialogProps {
  camera?: CameraType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (camera: CameraType) => void;
  onDelete: (cameraId: string) => void;
}

export function CameraSettingsDialog({
  camera,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: CameraSettingsDialogProps) {
  const [formData, setFormData] = useState<CameraType | undefined>(camera);

  // Reset form when camera changes
  useEffect(() => {
    setFormData(camera);
  }, [camera]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
      onOpenChange(false);
    }
  };

  // Handle form field changes
  const handleChange = (field: keyof CameraType, value: any) => {
    if (formData) {
      setFormData({
        ...formData,
        [field]: value,
      });
    }
  };

  // Handle delete confirmation
  const handleDelete = () => {
    if (camera) {
      onDelete(camera.id);
      onOpenChange(false);
    }
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-sentinel-purple" />
              <DialogTitle>Camera Settings</DialogTitle>
            </div>
            <DialogDescription>
              Configure camera details and streaming settings.
            </DialogDescription>
          </DialogHeader>

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
              <Label htmlFor="streamUrl">Stream URL</Label>
              <Input
                id="streamUrl"
                value={formData.streamUrl}
                onChange={(e) => handleChange("streamUrl", e.target.value)}
                required
              />
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="motionDetection">Motion Detection</Label>
                <Switch
                  id="motionDetection"
                  checked={formData.motionDetection}
                  onCheckedChange={(checked) =>
                    handleChange("motionDetection", checked)
                  }
                />
              </div>

              {formData.motionDetection && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="motionSensitivity">
                      Motion Sensitivity: {formData.motionSensitivity}%
                    </Label>
                  </div>
                  <Slider
                    id="motionSensitivity"
                    value={[formData.motionSensitivity]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) =>
                      handleChange("motionSensitivity", value[0])
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-row justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Camera
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
