
import React from "react";
import { cn } from "@/lib/utils";
import { CameraStatus } from "@/types";

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  status?: CameraStatus;
  className?: string;
}

export function StatusCard({ title, value, icon: Icon, status = 'active', className }: StatusCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-lg border border-border p-4", 
      "flex items-center gap-4 shadow-sm", 
      className
    )}>
      <div className={cn(
        "p-3 rounded-full",
        status === 'active' && "bg-sentinel-status-active/10",
        status === 'idle' && "bg-sentinel-status-idle/10",
        status === 'recording' && "bg-sentinel-status-recording/10",
        status === 'warning' && "bg-sentinel-status-warning/10",
        status === 'danger' && "bg-sentinel-status-danger/10",
        status === 'offline' && "bg-gray-500/10",
      )}>
        <Icon className={cn(
          "h-6 w-6",
          status === 'active' && "text-sentinel-status-active",
          status === 'idle' && "text-sentinel-status-idle",
          status === 'recording' && "text-sentinel-status-recording",
          status === 'warning' && "text-sentinel-status-warning",
          status === 'danger' && "text-sentinel-status-danger",
          status === 'offline' && "text-gray-500",
        )} />
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
      <div className="ml-auto">
        <div className={cn(
          "status-dot",
          status
        )} />
      </div>
    </div>
  );
}
