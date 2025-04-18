
import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Loader2 } from "lucide-react";
import { SystemDiagnostics } from "@/types";
import { toast } from "@/components/ui/use-toast";

const Settings = () => {
  const { settings, loading, saveSettings } = useSystemSettings();
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | undefined>(undefined);

  // Fetch system diagnostics
  const fetchDiagnostics = async () => {
    try {
      const response = await fetch('/api/diagnostics');
      if (!response.ok) throw new Error('Failed to fetch diagnostics');
      return await response.json();
    } catch (error) {
      console.error("Error fetching diagnostics:", error);
      return undefined;
    }
  };

  // Handle checking for updates
  const checkForUpdates = async () => {
    try {
      const response = await fetch('/api/settings/update/check');
      if (!response.ok) throw new Error('Failed to check for updates');
      return await response.json();
    } catch (error) {
      console.error("Error checking for updates:", error);
      throw error;
    }
  };

  // Handle system backup
  const handleBackup = async () => {
    try {
      const response = await fetch('/api/settings/backup');
      if (!response.ok) throw new Error('Failed to create backup');
      
      const { downloadUrl } = await response.json();
      return downloadUrl;
    } catch (error) {
      console.error("Error creating backup:", error);
      throw error;
    }
  };

  // Handle system restore
  const handleRestore = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('backup', file);
      
      const response = await fetch('/api/settings/restore', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to restore system');
      
      const { success } = await response.json();
      return success;
    } catch (error) {
      console.error("Error restoring system:", error);
      throw error;
    }
  };

  // Load diagnostics on initial render
  useEffect(() => {
    fetchDiagnostics().then(data => {
      if (data) setDiagnostics(data);
    });
  }, []);

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <PageHeader 
        title="System Settings" 
        description="Configure system-wide settings for VisionHub One Sentinel"
      />
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-sentinel-purple" />
        </div>
      ) : (
        <SettingsForm 
          settings={settings}
          diagnostics={diagnostics}
          onSave={saveSettings}
          onCheckUpdate={checkForUpdates}
          onBackup={handleBackup}
          onRestore={handleRestore}
          onRefreshDiagnostics={fetchDiagnostics}
        />
      )}
    </div>
  );
};

export default Settings;
