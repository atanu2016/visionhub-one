
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { SystemSettings, StorageType, SystemDiagnostics } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HardDrive, 
  HelpCircle, 
  Server, 
  Loader2, 
  Check, 
  Lock, 
  Mail, 
  Database, 
  RefreshCw, 
  Package, 
  Bell,
  Workflow,
  Activity,
  Upload,
  Download,
  Cpu
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DiagnosticsCard } from "./DiagnosticsCard";
import { AlertSettings } from "./AlertSettings";
import { SSLSettings } from "./SSLSettings";
import { BackupSettings } from "./BackupSettings";
import { SystemUpdateCard } from "./SystemUpdateCard";

interface SettingsFormProps {
  settings: SystemSettings;
  diagnostics?: SystemDiagnostics;
  onSave: (settings: SystemSettings) => Promise<SystemSettings | null>;
  onCheckUpdate?: () => Promise<{version: string, hasUpdate: boolean, changelog?: string}>;
  onBackup?: () => Promise<string>;
  onRestore?: (file: File) => Promise<boolean>;
  onRefreshDiagnostics?: () => Promise<SystemDiagnostics>;
}

export function SettingsForm({ 
  settings, 
  diagnostics, 
  onSave,
  onCheckUpdate,
  onBackup,
  onRestore,
  onRefreshDiagnostics
}: SettingsFormProps) {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState("storage");

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form field changes
  const handleChange = (field: keyof SystemSettings, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  // Validate NAS connection
  const validateNasConnection = async () => {
    if (!formData.nasPath) {
      return;
    }
    
    setIsValidating(true);
    
    try {
      await fetch('/api/settings/nas/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: formData.nasPath,
          username: formData.nasUsername,
          password: formData.nasPassword,
        }),
      });
    } catch (error) {
      console.error("Error validating NAS connection:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const tabItems = [
    { id: 'storage', label: 'Storage', icon: <HardDrive className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="h-4 w-4" /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell className="h-4 w-4" /> },
    { id: 'network', label: 'Network', icon: <Workflow className="h-4 w-4" /> },
    { id: 'backup', label: 'Backup', icon: <Database className="h-4 w-4" /> },
    { id: 'updates', label: 'Updates', icon: <RefreshCw className="h-4 w-4" /> },
    { id: 'diagnostics', label: 'Diagnostics', icon: <Activity className="h-4 w-4" /> }
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-4 overflow-x-auto">
            <TabsList className="inline-flex h-10 items-center">
              {tabItems.map(tab => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id}
                  className="inline-flex items-center gap-2 px-4 py-2"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Storage Settings */}
          <TabsContent value="storage" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-sentinel-purple" />
                  <CardTitle>Storage Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure where recordings and other data are stored
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs 
                  defaultValue={formData.storageType} 
                  onValueChange={(value) => handleChange("storageType", value as StorageType)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="local" className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      Local Storage
                    </TabsTrigger>
                    <TabsTrigger value="nas" className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      NAS Storage
                      {formData.nasMounted && (
                        <Badge variant="outline" className="ml-1 bg-green-50 text-green-600 border-green-200">
                          Mounted
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <div className="mt-4">
                    <TabsContent value="local" className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="storageLocation">Recording Storage Path</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-80">
                                  Path to the directory where camera recordings will be saved. 
                                  Make sure the directory exists and has proper permissions.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          id="storageLocation"
                          value={formData.storageLocation}
                          onChange={(e) => handleChange("storageLocation", e.target.value)}
                          placeholder="/var/visionhub/recordings/"
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="nas" className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="nasPath">NAS Share Path</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-80">
                                  Path to the NAS share in format //server/share. 
                                  For example: //192.168.1.10/recordings
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          id="nasPath"
                          value={formData.nasPath || ''}
                          onChange={(e) => handleChange("nasPath", e.target.value)}
                          placeholder="//192.168.1.10/recordings"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nasUsername">NAS Username</Label>
                          <Input
                            id="nasUsername"
                            value={formData.nasUsername || ''}
                            onChange={(e) => handleChange("nasUsername", e.target.value)}
                            placeholder="username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nasPassword">NAS Password</Label>
                          <Input
                            id="nasPassword"
                            type="password"
                            value={formData.nasPassword || ''}
                            onChange={(e) => handleChange("nasPassword", e.target.value)}
                            placeholder="password"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={validateNasConnection}
                          disabled={isValidating || !formData.nasPath}
                        >
                          {isValidating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Validating...
                            </>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Test Connection
                            </>
                          )}
                        </Button>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Will be mounted at /mnt/visionhub when applied
                        </p>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="recordingFormat">Recording Format</Label>
                    <Select
                      value={formData.recordingFormat}
                      onValueChange={(value) => handleChange("recordingFormat", value as any)}
                    >
                      <SelectTrigger id="recordingFormat">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp4">MP4</SelectItem>
                        <SelectItem value="mkv">MKV</SelectItem>
                        <SelectItem value="avi">AVI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recordingQuality">Recording Quality</Label>
                    <Select
                      value={formData.recordingQuality}
                      onValueChange={(value) => handleChange("recordingQuality", value as any)}
                    >
                      <SelectTrigger id="recordingQuality">
                        <SelectValue placeholder="Select quality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retentionDays">Retention Period (Days)</Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.retentionDays}
                    onChange={(e) => handleChange("retentionDays", parseInt(e.target.value, 10))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recordings older than this will be automatically deleted
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4">
            <SSLSettings 
              sslEnabled={formData.sslEnabled}
              onToggleSsl={(enabled) => handleChange("sslEnabled", enabled)}
              onCertificateUpload={(path) => handleChange("sslCertPath", path)}
              onKeyUpload={(path) => handleChange("sslKeyPath", path)}
              certPath={formData.sslCertPath}
              keyPath={formData.sslKeyPath}
            />
          </TabsContent>

          {/* Alert Settings */}
          <TabsContent value="alerts" className="space-y-4">
            <AlertSettings
              settings={formData}
              onChange={handleChange}
            />
          </TabsContent>

          {/* Network Settings */}
          <TabsContent value="network" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-sentinel-purple" />
                  <CardTitle>Network Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure network scanning for camera discovery
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="networkSubnet">Network Subnet</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-80">
                            Default subnet to scan for camera discovery in CIDR notation. 
                            For example: 192.168.1.0/24
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="networkSubnet"
                    value={formData.networkSubnet}
                    onChange={(e) => handleChange("networkSubnet", e.target.value)}
                    placeholder="192.168.1.0/24"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup Settings */}
          <TabsContent value="backup" className="space-y-4">
            <BackupSettings
              onBackup={onBackup}
              onRestore={onRestore}
            />
          </TabsContent>

          {/* System Update */}
          <TabsContent value="updates" className="space-y-4">
            <SystemUpdateCard 
              currentVersion={formData.appVersion || "Unknown"}
              onCheckUpdate={onCheckUpdate}
            />
          </TabsContent>

          {/* System Diagnostics */}
          <TabsContent value="diagnostics" className="space-y-4">
            <DiagnosticsCard 
              diagnostics={diagnostics}
              onRefresh={onRefreshDiagnostics}
            />
          </TabsContent>
        </Tabs>

        <CardFooter className="px-0 pb-0">
          <Button type="submit" disabled={isSaving} className="flex items-center">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying Changes...
              </>
            ) : (
              'Apply Changes'
            )}
          </Button>
        </CardFooter>
      </div>
    </form>
  );
}
