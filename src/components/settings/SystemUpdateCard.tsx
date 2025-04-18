
import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SystemUpdateCardProps {
  currentVersion: string;
  onCheckUpdate?: () => Promise<{version: string, hasUpdate: boolean, changelog?: string}>;
}

export function SystemUpdateCard({ currentVersion, onCheckUpdate }: SystemUpdateCardProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    hasUpdate: boolean;
    changelog?: string;
  } | null>(null);
  const [openConfirmation, setOpenConfirmation] = useState(false);

  const checkForUpdates = async () => {
    if (!onCheckUpdate) return;
    
    setIsChecking(true);
    try {
      const info = await onCheckUpdate();
      setUpdateInfo(info);
      
      if (!info.hasUpdate) {
        toast({
          title: "System up to date",
          description: `You're already running the latest version (${info.version})`,
        });
      }
    } catch (error) {
      console.error("Update check error:", error);
      toast({
        title: "Update check failed",
        description: "Failed to check for system updates",
        variant: "destructive",
      });
      setUpdateInfo(null);
    } finally {
      setIsChecking(false);
    }
  };

  const installUpdate = async () => {
    setIsUpdating(true);
    try {
      // Call API to install update
      const response = await fetch('/api/settings/update/install', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to install update');
      }
      
      toast({
        title: "Update initiated",
        description: "The system is updating and will restart automatically",
      });
      
      // Close dialog
      setOpenConfirmation(false);
      
      // Start polling for server to come back online
      setTimeout(() => {
        // This will trigger a reload when the server comes back online
        const checkServerInterval = setInterval(() => {
          fetch('/api/settings')
            .then(response => {
              if (response.ok) {
                clearInterval(checkServerInterval);
                window.location.reload();
              }
            })
            .catch(() => {
              // Server still restarting, continue polling
            });
        }, 3000);
      }, 5000);
      
    } catch (error) {
      console.error("Update installation error:", error);
      toast({
        title: "Update failed",
        description: "Failed to install system update",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-sentinel-purple" />
          <CardTitle>System Update</CardTitle>
        </div>
        <CardDescription>
          Check for and install VisionHub system updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Current Version</p>
            <p className="text-xl font-semibold">{currentVersion}</p>
          </div>
          
          <Button
            onClick={checkForUpdates}
            variant="outline"
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check for Updates
              </>
            )}
          </Button>
        </div>
        
        {updateInfo?.hasUpdate && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Update Available!</h3>
                <p className="text-sm text-muted-foreground">
                  Version {updateInfo.version} is now available
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            
            {updateInfo.changelog && (
              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-medium mb-2">What's new:</p>
                <div className="text-sm overflow-y-auto max-h-48 bg-gray-50 p-3 rounded-md">
                  <pre className="whitespace-pre-wrap">{updateInfo.changelog}</pre>
                </div>
              </div>
            )}
            
            <Button
              onClick={() => setOpenConfirmation(true)}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Install Update
            </Button>
          </div>
        )}
      </CardContent>
      
      <AlertDialog open={openConfirmation} onOpenChange={setOpenConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Install system update?</AlertDialogTitle>
            <AlertDialogDescription>
              The system will download and install the update, then automatically restart.
              This process may take several minutes to complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={installUpdate} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Installing...
                </>
              ) : (
                'Install Now'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
