
import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const Settings = () => {
  const { settings, loading, saveSettings } = useSystemSettings();

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <PageHeader 
        title="System Settings" 
        description="Configure system-wide settings for VisionHub One Sentinel"
      />
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sentinel-purple"></div>
        </div>
      ) : (
        <SettingsForm 
          settings={settings}
          onSave={saveSettings}
        />
      )}
    </div>
  );
};

export default Settings;
