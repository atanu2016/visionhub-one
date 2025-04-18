
import React, { useState, useRef } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload, Loader2, AlertTriangle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface BackupSettingsProps {
  onBackup?: () => Promise<string>;
  onRestore?: (file: File) => Promise<boolean>;
}

export function BackupSettings({ onBackup, onRestore }: BackupSettingsProps) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openConfirmation, setOpenConfirmation] = useState(false);
  
  const handleBackup = async () => {
    if (!onBackup) return;
    
    setIsBackingUp(true);
    try {
      const downloadUrl = await onBackup();
      
      // Create an invisible link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `visionhub-backup-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Backup created",
        description: "Your system backup has been created and downloaded",
      });
    } catch (error) {
      console.error("Backup error:", error);
      toast({
        title: "Backup failed",
        description: "Failed to create system backup",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const file = e.target.files[0];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (fileExtension !== 'zip') {
      toast({
        title: "Invalid file format",
        description: "Please upload a valid backup (.zip) file",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedFile(file);
    setOpenConfirmation(true);
  };

  const handleRestore = async () => {
    if (!onRestore || !selectedFile) return;
    
    setIsRestoring(true);
    try {
      const success = await onRestore(selectedFile);
      
      if (success) {
        toast({
          title: "System restored",
          description: "Your system has been restored from backup",
        });
      } else {
        throw new Error("Restore failed");
      }
    } catch (error) {
      console.error("Restore error:", error);
      toast({
        title: "Restore failed",
        description: "Failed to restore system from backup",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
      setOpenConfirmation(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-sentinel-purple" />
          <CardTitle>Backup & Restore</CardTitle>
        </div>
        <CardDescription>
          Backup and restore system settings and configuration data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4 space-y-4">
            <div>
              <h3 className="font-medium flex items-center">
                <Download className="h-4 w-4 mr-2" /> Backup System
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Export configuration, camera settings, and all metadata
              </p>
            </div>
            
            <Button
              onClick={handleBackup}
              disabled={isBackingUp || !onBackup}
              className="w-full"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating backup...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Backup
                </>
              )}
            </Button>
            <div className="text-xs text-muted-foreground">
              <p>Includes:</p>
              <ul className="list-disc list-inside">
                <li>System settings</li>
                <li>Camera configurations</li>
                <li>Event history</li>
                <li>User preferences</li>
              </ul>
              <p className="mt-1">Does not include recording files</p>
            </div>
          </div>
          
          <div className="border rounded-lg p-4 space-y-4">
            <div>
              <h3 className="font-medium flex items-center">
                <Upload className="h-4 w-4 mr-2" /> Restore System
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Restore system state from a previous backup
              </p>
            </div>
            
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
                className="w-full"
                disabled={isRestoring || !onRestore}
              >
                <Upload className="mr-2 h-4 w-4" />
                Select Backup File
              </Button>
              {selectedFile && (
                <div className="mt-2 flex items-center">
                  <Badge variant="outline" className="text-xs">
                    {selectedFile.name}
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800">
                Warning: Restoring will overwrite all current settings and may require restarting the system.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      
      <AlertDialog open={openConfirmation} onOpenChange={setOpenConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite your current system configuration with the data from the backup file.
              This action cannot be undone and may restart some system services.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Proceed with Restore'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
