
import React from "react";
import { cn } from "@/lib/utils";
import { Settings, Video, VideoOff } from "lucide-react";
import { Camera as CameraType } from "@/types";
import { Button } from "@/components/ui/button";

interface CameraListItemProps {
  camera: CameraType;
  onSettings: (camera: CameraType) => void;
  onToggleRecording: (camera: CameraType) => void;
  className?: string;
}

export function CameraListItem({ 
  camera, 
  onSettings, 
  onToggleRecording, 
  className 
}: CameraListItemProps) {
  return (
    <div className={cn(
      "flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-md", 
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("status-dot", camera.status)} />
        <div>
          <h3 className="font-medium">{camera.name}</h3>
          <p className="text-sm text-muted-foreground">{camera.ipAddress}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {camera.isRecording && (
          <span className="text-xs font-medium text-sentinel-status-recording px-2 py-0.5 bg-sentinel-status-recording/10 rounded-full">
            Recording
          </span>
        )}
        
        <span className="text-xs text-muted-foreground">
          {camera.location || 'No location'}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onToggleRecording(camera)} 
          className={cn(
            "h-8 w-8 p-0", 
            camera.isRecording && "text-sentinel-status-recording border-sentinel-status-recording"
          )}
        >
          {camera.isRecording ? (
            <VideoOff className="h-4 w-4" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          <span className="sr-only">
            {camera.isRecording ? "Stop Recording" : "Start Recording"}
          </span>
        </Button>
        <Button 
          variant="outline"
          size="sm" 
          onClick={() => onSettings(camera)}
          className="h-8 w-8 p-0"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>
    </div>
  );
}
