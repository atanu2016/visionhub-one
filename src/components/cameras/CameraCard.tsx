
import React from "react";
import { cn } from "@/lib/utils";
import { Camera, Settings, Video, MoreVertical, VideoOff } from "lucide-react";
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
  // In a real app, this would be a video stream
  const streamPlaceholder = camera.thumbnail || 
    `https://source.unsplash.com/random/400x300?security,camera&sig=${camera.id}`;

  return (
    <div className={cn(
      "rounded-lg border border-border overflow-hidden bg-card flex flex-col shadow-sm", 
      className
    )}>
      {/* Video stream display */}
      <div className="aspect-video bg-black relative">
        <img 
          src={streamPlaceholder} 
          alt={`Camera stream: ${camera.name}`} 
          className="w-full h-full object-cover"
        />
        
        {/* Status indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs font-medium">
          <div className={cn("status-dot", camera.status)} />
          <span className="capitalize">{camera.status}</span>
        </div>
        
        {/* Camera info */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs">
          <Camera className="h-3.5 w-3.5" />
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
            <DropdownMenuItem>Fullscreen</DropdownMenuItem>
            <DropdownMenuItem>Take Snapshot</DropdownMenuItem>
            <DropdownMenuItem>Camera Info</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Delete Camera</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
