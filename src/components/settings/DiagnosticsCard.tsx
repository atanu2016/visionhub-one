
import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SystemDiagnostics } from "@/types";
import { Cpu, RefreshCw, Loader2, HardDrive, Memory, Activity, Tv2, PieChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DiagnosticsCardProps {
  diagnostics?: SystemDiagnostics;
  onRefresh?: () => Promise<SystemDiagnostics>;
}

export function DiagnosticsCard({ diagnostics, onRefresh }: DiagnosticsCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<SystemDiagnostics | undefined>(diagnostics);
  const [countdown, setCountdown] = useState(30);
  
  // Format bytes to human-readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format seconds to days, hours, minutes, seconds
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };
  
  const refreshDiagnostics = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      const newData = await onRefresh();
      setData(newData);
    } catch (error) {
      console.error("Diagnostics refresh error:", error);
    } finally {
      setIsRefreshing(false);
      setCountdown(30); // Reset countdown
    }
  };
  
  // Auto-refresh countdown
  useEffect(() => {
    if (!onRefresh) return;
    
    const timer = setTimeout(() => {
      if (countdown > 0) {
        setCountdown(countdown - 1);
      } else {
        refreshDiagnostics();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, onRefresh]);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-sentinel-purple" />
            <CardTitle>System Diagnostics</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={refreshDiagnostics}
            className="h-8"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh {countdown > 0 && `(${countdown}s)`}
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Monitor system health and resource usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* CPU Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">CPU Usage</span>
                  </div>
                  <span className="font-semibold">{data.cpu.toFixed(1)}%</span>
                </div>
                <Progress value={data.cpu} className="h-2" />
              </div>
              
              {/* Memory Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Memory className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Memory Usage</span>
                  </div>
                  <span className="font-semibold">
                    {formatBytes(data.memory.used)} / {formatBytes(data.memory.total)}
                  </span>
                </div>
                <Progress 
                  value={(data.memory.used / data.memory.total) * 100} 
                  className="h-2" 
                />
                <div className="text-xs text-gray-500">
                  Free: {formatBytes(data.memory.free)}
                </div>
              </div>
              
              {/* Disk Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">Disk Usage ({data.disk.path})</span>
                  </div>
                  <span className="font-semibold">
                    {formatBytes(data.disk.used)} / {formatBytes(data.disk.total)}
                  </span>
                </div>
                <Progress 
                  value={(data.disk.used / data.disk.total) * 100} 
                  className="h-2" 
                />
                <div className="text-xs text-gray-500">
                  Free: {formatBytes(data.disk.free)}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* System Uptime */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span>System Uptime</span>
                </div>
                <span className="font-semibold">
                  {formatUptime(data.uptime)}
                </span>
              </div>
              
              {/* Active Streams */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Tv2 className="h-4 w-4 text-red-500" />
                  <span>Active Streams</span>
                </div>
                <span className="font-semibold">
                  {data.activeStreams}
                </span>
              </div>
              
              {/* Camera Status */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-blue-500" />
                  <span>Connected Cameras</span>
                </div>
                <span className="font-semibold">
                  {data.connectedCameras} / {data.totalCameras}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Activity className="h-10 w-10 mb-4 opacity-50" />
            <p>No diagnostic data available</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshDiagnostics}
              className="mt-4"
              disabled={isRefreshing}
            >
              Fetch Diagnostics
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
