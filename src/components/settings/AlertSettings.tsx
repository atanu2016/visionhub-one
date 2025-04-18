
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { SystemSettings } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Webhook, AlertTriangle, HelpCircle } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AlertSettingsProps {
  settings: SystemSettings;
  onChange: (field: keyof SystemSettings, value: any) => void;
}

export function AlertSettings({ settings, onChange }: AlertSettingsProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-sentinel-purple" />
            <CardTitle>Alert Settings</CardTitle>
          </div>
          <CardDescription>
            Configure notifications for security events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="motionDetectionEnabled"
              checked={settings.motionDetectionEnabled}
              onCheckedChange={(checked) =>
                onChange("motionDetectionEnabled", checked)
              }
            />
            <Label htmlFor="motionDetectionEnabled" className="text-base">
              Enable system-wide motion detection
            </Label>
          </div>

          <Separator />

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Alerts
              </TabsTrigger>
              <TabsTrigger value="webhook" className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhook Alerts
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="smtpServer">SMTP Server</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-80">
                          The address of your SMTP server for sending email alerts
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="smtpServer"
                  value={settings.smtpServer || ""}
                  onChange={(e) => onChange("smtpServer", e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.smtpPort || ""}
                    onChange={(e) => onChange("smtpPort", parseInt(e.target.value, 10) || "")}
                    placeholder="587"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpSenderEmail">Sender Email</Label>
                  <Input
                    id="smtpSenderEmail"
                    type="email"
                    value={settings.smtpSenderEmail || ""}
                    onChange={(e) => onChange("smtpSenderEmail", e.target.value)}
                    placeholder="alerts@yourdomain.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP Username</Label>
                  <Input
                    id="smtpUsername"
                    value={settings.smtpUsername || ""}
                    onChange={(e) => onChange("smtpUsername", e.target.value)}
                    placeholder="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={settings.smtpPassword || ""}
                    onChange={(e) => onChange("smtpPassword", e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alertEmail">Recipient Email</Label>
                <Input
                  id="alertEmail"
                  type="email"
                  value={settings.alertEmail || ""}
                  onChange={(e) => onChange("alertEmail", e.target.value)}
                  placeholder="recipient@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Email address to send alerts to (leave blank to disable)
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="webhook" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="alertWebhookUrl">Webhook URL</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-80">
                          The URL to call when an alert is triggered. VisionHub will send a POST request
                          with event details in JSON format.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="alertWebhookUrl"
                  value={settings.alertWebhookUrl || ""}
                  onChange={(e) => onChange("alertWebhookUrl", e.target.value)}
                  placeholder="https://example.com/webhook"
                />
                <p className="text-xs text-muted-foreground">
                  Webhook to call for alerts (leave blank to disable)
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
