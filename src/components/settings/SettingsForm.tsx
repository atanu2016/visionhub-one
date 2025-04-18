
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { SystemSettings, StorageType } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HardDrive, HelpCircle, Server, Loader2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SettingsFormProps {
  settings: SystemSettings;
  onSave: (settings: SystemSettings) => Promise<SystemSettings | null>;
}

export function SettingsForm({ settings, onSave }: SettingsFormProps) {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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
      // In a real app, this would validate via the API
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

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Storage Settings */}
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

        {/* Network Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Network Settings</CardTitle>
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

        {/* Alerting Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Settings</CardTitle>
            <CardDescription>
              Configure notifications for events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="motionDetectionEnabled"
                checked={formData.motionDetectionEnabled}
                onCheckedChange={(checked) =>
                  handleChange("motionDetectionEnabled", checked)
                }
              />
              <Label htmlFor="motionDetectionEnabled">
                Enable system-wide motion detection
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertEmail">Alert Email Address</Label>
              <Input
                id="alertEmail"
                type="email"
                value={formData.alertEmail || ""}
                onChange={(e) => handleChange("alertEmail", e.target.value)}
                placeholder="alerts@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Email address to send alerts to (leave blank to disable)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertWebhookUrl">Alert Webhook URL</Label>
              <Input
                id="alertWebhookUrl"
                value={formData.alertWebhookUrl || ""}
                onChange={(e) => handleChange("alertWebhookUrl", e.target.value)}
                placeholder="https://example.com/webhook"
              />
              <p className="text-xs text-muted-foreground">
                Webhook to call for alerts (leave blank to disable)
              </p>
            </div>
          </CardContent>
        </Card>

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
