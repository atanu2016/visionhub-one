
import React from "react";
import { cn } from "@/lib/utils";
import { Camera, Settings, Video, MoreVertical, VideoOff, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { Camera as CameraType } from "@/types";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";

interface CameraCardProps {
  camera: CameraType;
  onSettings: (camera: CameraType) => void;
  onToggleRecording: (camera: CameraType) => void;
  className?: string;
}

export function CameraCard({ 
  camera, 
  onSettings, 
  onToggleRecording, 
  className 
}: CameraCardProps) {
  // In a real app, this would be a video stream from the backend
  const streamPlaceholder = camera.thumbnail || 
    `https://source.unsplash.com/random/400x300?security,camera&sig=${camera.id}`;
  
  // Get the appropriate status icon
  const getStatusIcon = () => {
    switch(camera.status) {
      case 'active':
        return <Wifi className="h-3.5 w-3.5" />;
      case 'offline':
        return <WifiOff className="h-3.5 w-3.5" />;
      case 'warning':
      case 'danger':
        return <AlertTriangle className="h-3.5 w-3.5" />;
      default:
        return <Camera className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className={cn(
      "rounded-lg border border-border overflow-hidden bg-card flex flex-col shadow-sm", 
      className
    )}>
      {/* Video stream display */}
      <div className="aspect-video bg-black relative">
        {camera.status === 'offline' ? (
          <div className="w-full h-full flex items-center justify-center bg-muted/80 text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <WifiOff className="h-12 w-12 opacity-50" />
              <p className="text-sm font-medium">Camera Offline</p>
            </div>
          </div>
        ) : (
          <img 
            src={streamPlaceholder} 
            alt={`Camera stream: ${camera.name}`} 
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Status indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs font-medium">
          <div className={cn("status-dot", camera.status)} />
          <span className="capitalize">{camera.status}</span>
        </div>
        
        {/* Recording indicator */}
        {camera.isRecording && (
          <div className="absolute top-3 right-3 flex items-center gap-2 px-2 py-1 bg-sentinel-status-recording/25 backdrop-blur-sm rounded-md text-xs font-medium text-sentinel-status-recording">
            <div className="h-2 w-2 rounded-full bg-sentinel-status-recording animate-pulse"></div>
            <span>Recording</span>
          </div>
        )}
        
        {/* Camera info */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs">
          {getStatusIcon()}
          <span>{camera.name}</span>
        </div>
      </div>
      
      {/* Controls */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onToggleRecording(camera)} 
            className={cn(
              "h-8 w-8 p-0", 
              camera.isRecording && "text-sentinel-status-recording border-sentinel-status-recording"
            )}
            disabled={camera.status === 'offline'}
            title={camera.isRecording ? "Stop Recording" : "Start Recording"}
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
            title="Camera Settings"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
        
        <span className="text-xs text-muted-foreground">
          {camera.location || 'No location'}
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(`/cameras/stream/${camera.id}`)}>
              Fullscreen
            </DropdownMenuItem>
            <DropdownMenuItem>Take Snapshot</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onSettings(camera)}>
              Remove Camera
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
