
import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Mail,
  Globe,
  CheckCircle,
  AlertTriangle,
  Send,
  Loader2
} from "lucide-react";
import { SystemSettings } from "@/types";
import { toast } from "@/hooks/use-toast";
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
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  
  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast({
        title: "Email required",
        description: "Please enter an email address to send a test alert",
        variant: "destructive"
      });
      return;
    }
    
    if (!settings.alertEmail && !settings.smtpSenderEmail) {
      toast({
        title: "SMTP configuration incomplete",
        description: "Please configure the SMTP settings before sending a test email",
        variant: "destructive"
      });
      return;
    }
    
    setSendingTestEmail(true);
    
    try {
      const response = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmailAddress,
          subject: 'Test Alert from VisionHub One',
          message: 'This is a test alert email from VisionHub One Sentinel system.'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }
      
      toast({
        title: "Test email sent",
        description: `A test email was sent to ${testEmailAddress}`,
      });
      
      // Clear the test email address field
      setTestEmailAddress("");
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Failed to send test email",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-sentinel-purple" />
          <CardTitle>Alert Settings</CardTitle>
        </div>
        <CardDescription>
          Configure how and when you receive system alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Email Notifications</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alert-email">Admin Email Address</Label>
              <Input 
                id="alert-email" 
                value={settings.alertEmail || ''} 
                onChange={(e) => onChange('alertEmail', e.target.value)}
                placeholder="admin@example.com"
              />
              <p className="text-xs text-muted-foreground">Email address to receive system alerts</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-sender">SMTP Sender Name</Label>
              <Input 
                id="smtp-sender" 
                value={settings.smtpSenderEmail || ''} 
                onChange={(e) => onChange('smtpSenderEmail', e.target.value)}
                placeholder="noreply@visionhub.local"
              />
              <p className="text-xs text-muted-foreground">Email address used to send alerts</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-server">SMTP Server</Label>
              <Input 
                id="smtp-server" 
                value={settings.smtpServer || ''} 
                onChange={(e) => onChange('smtpServer', e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP Port</Label>
              <Input 
                id="smtp-port" 
                type="number" 
                value={settings.smtpPort || ''} 
                onChange={(e) => onChange('smtpPort', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="587"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-username">SMTP Username</Label>
              <Input 
                id="smtp-username" 
                value={settings.smtpUsername || ''} 
                onChange={(e) => onChange('smtpUsername', e.target.value)}
                placeholder="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-password">SMTP Password</Label>
              <Input 
                id="smtp-password" 
                type="password" 
                value={settings.smtpPassword || ''} 
                onChange={(e) => onChange('smtpPassword', e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Input
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="Enter email for test alert"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSendTestEmail}
              disabled={sendingTestEmail || !testEmailAddress}
            >
              {sendingTestEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-medium mb-4">Alert Types</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="motion-alerts" className="text-base">Motion Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts when motion is detected
                </p>
              </div>
              <Switch
                id="motion-alerts"
                checked={settings.motionAlerts || false}
                onCheckedChange={(checked) => onChange('motionAlerts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="camera-disconnect-alerts" className="text-base">Camera Disconnect</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts when a camera disconnects
                </p>
              </div>
              <Switch
                id="camera-disconnect-alerts"
                checked={settings.cameraDisconnectAlerts || false}
                onCheckedChange={(checked) => onChange('cameraDisconnectAlerts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="storage-alerts" className="text-base">Storage Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts when storage is running low
                </p>
              </div>
              <Switch
                id="storage-alerts"
                checked={settings.storageAlerts || false}
                onCheckedChange={(checked) => onChange('storageAlerts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="system-alerts" className="text-base">System Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts for important system events
                </p>
              </div>
              <Switch
                id="system-alerts"
                checked={settings.systemAlerts || false}
                onCheckedChange={(checked) => onChange('systemAlerts', checked)}
              />
            </div>
          </div>
        </div>
        
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-medium mb-4">Webhook Integration</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="webhook-enabled" className="text-base">Enable Webhooks</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-80">
                          Send alert data to external systems via webhooks.
                          Webhook will receive a JSON payload with alert details.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground">
                  Send alert data to external systems
                </p>
              </div>
              <Switch
                id="webhook-enabled"
                checked={settings.webhookEnabled || false}
                onCheckedChange={(checked) => onChange('webhookEnabled', checked)}
              />
            </div>
            
            {settings.webhookEnabled && (
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input 
                  id="webhook-url" 
                  value={settings.alertWebhookUrl || ''} 
                  onChange={(e) => onChange('alertWebhookUrl', e.target.value)}
                  placeholder="https://example.com/webhook"
                />
                <p className="text-xs text-muted-foreground">
                  URL to send webhook data to when alerts are triggered
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
