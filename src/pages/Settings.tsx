
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { AlertSettings } from "@/components/settings/AlertSettings";
import { BackupSettings } from "@/components/settings/BackupSettings";
import { DiagnosticsCard } from "@/components/settings/DiagnosticsCard";
import { SystemUpdateCard } from "@/components/settings/SystemUpdateCard";
import { SSLSettings } from "@/components/settings/SSLSettings";
import UserManagement from "@/components/settings/UserManagement";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { SystemDiagnostics, SystemSettings } from "@/types";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const { user } = useAuth();
  const { settings, saveSettings, validateNasConnection } = useSystemSettings();
  const isAdmin = user?.role === 'admin';

  const fetchDiagnostics = async (): Promise<SystemDiagnostics> => {
    try {
      const response = await fetch('/api/diagnostics');
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      const data = await response.json();
      setDiagnostics(data);
      return data;
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      toast({
        title: "Error",
        description: "Failed to load system diagnostics",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    // Poll for diagnostics every 30 seconds
    const interval = setInterval(() => fetchDiagnostics(), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSettingsChange = (field: keyof SystemSettings, value: any) => {
    if (settings) {
      const updatedSettings = { ...settings, [field]: value };
      saveSettings(updatedSettings);
    }
  };

  // SSL Settings handlers
  const handleToggleSsl = (enabled: boolean) => {
    if (settings) {
      handleSettingsChange('sslEnabled', enabled);
    }
  };

  const handleCertificateUpload = (path: string) => {
    if (settings) {
      handleSettingsChange('sslCertPath', path);
    }
  };

  const handleKeyUpload = (path: string) => {
    if (settings) {
      handleSettingsChange('sslKeyPath', path);
    }
  };

  // Function to check for updates
  const checkForUpdates = async () => {
    try {
      const response = await fetch('/api/settings/update/check');
      if (!response.ok) {
        throw new Error('Failed to check for updates');
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { version: settings?.appVersion || "Unknown", hasUpdate: false };
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure system preferences and manage your VisionHub"
      />
      
      <Tabs defaultValue="general" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-8 lg:w-fit">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          {settings && (
            <SettingsForm 
              settings={settings} 
              onSave={saveSettings}
              diagnostics={diagnostics || undefined}
              onCheckUpdate={checkForUpdates}
            />
          )}
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-6">
          {settings && (
            <AlertSettings 
              settings={settings} 
              onChange={handleSettingsChange} 
            />
          )}
        </TabsContent>
        
        <TabsContent value="backups" className="space-y-6">
          <BackupSettings />
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <SSLSettings 
            sslEnabled={settings?.sslEnabled || false}
            certPath={settings?.sslCertPath}
            keyPath={settings?.sslKeyPath}
            onToggleSsl={handleToggleSsl}
            onCertificateUpload={handleCertificateUpload}
            onKeyUpload={handleKeyUpload}
          />
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>
        )}
        
        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <DiagnosticsCard diagnostics={diagnostics} onRefresh={fetchDiagnostics} />
            <SystemUpdateCard 
              currentVersion={settings?.appVersion || "Unknown"} 
              onCheckUpdate={checkForUpdates}
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Settings;
