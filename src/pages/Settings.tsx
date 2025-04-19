
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

const Settings = () => {
  const [diagnostics, setDiagnostics] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const fetchDiagnostics = async () => {
    try {
      const response = await fetch('/api/diagnostics');
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      const data = await response.json();
      setDiagnostics(data);
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    // Poll for diagnostics every 30 seconds
    const interval = setInterval(fetchDiagnostics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <PageHeader
        heading="Settings"
        subheading="Configure system preferences and manage your VisionHub"
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
          <SettingsForm />
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-6">
          <AlertSettings />
        </TabsContent>
        
        <TabsContent value="backups" className="space-y-6">
          <BackupSettings />
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <SSLSettings />
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>
        )}
        
        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <DiagnosticsCard diagnostics={diagnostics} onRefresh={fetchDiagnostics} />
            <SystemUpdateCard />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Settings;
