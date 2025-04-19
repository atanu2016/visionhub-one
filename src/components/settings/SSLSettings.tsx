
import React, { useState, useRef } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Upload, CheckCircle, AlertCircle, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SSLSettingsProps {
  sslEnabled: boolean;
  certPath?: string;
  keyPath?: string;
  onToggleSsl: (enabled: boolean) => void;
  onCertificateUpload: (path: string) => void;
  onKeyUpload: (path: string) => void;
}

export function SSLSettings({
  sslEnabled,
  certPath,
  keyPath,
  onToggleSsl,
  onCertificateUpload,
  onKeyUpload
}: SSLSettingsProps) {
  const [uploading, setUploading] = useState<'cert' | 'key' | null>(null);
  const [generating, setGenerating] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const validTypes = [
      'application/x-x509-ca-cert', 
      'application/x-pem-file', 
      'application/pkix-cert',
      'application/x-x509-user-cert',
      'text/plain' // Some .pem files might have this content type
    ];
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const isValidExtension = ['crt', 'pem', 'cert'].includes(fileExtension);
    
    if (!isValidExtension) {
      toast({
        title: "Invalid file format",
        description: "Please upload a valid SSL certificate (.crt, .pem, or .cert)",
        variant: "destructive"
      });
      return;
    }

    setUploading('cert');
    
    try {
      const formData = new FormData();
      formData.append('certificate', file);
      
      const response = await fetch('/api/settings/ssl/certificate', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload certificate');
      }
      
      const { path } = await response.json();
      onCertificateUpload(path);
      
      toast({
        title: "Certificate uploaded",
        description: "SSL certificate uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading certificate:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload SSL certificate",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  const handleKeyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const isValidExtension = ['key', 'pem'].includes(fileExtension);
    
    if (!isValidExtension) {
      toast({
        title: "Invalid file format",
        description: "Please upload a valid SSL private key (.key or .pem)",
        variant: "destructive"
      });
      return;
    }

    setUploading('key');
    
    try {
      const formData = new FormData();
      formData.append('key', file);
      
      const response = await fetch('/api/settings/ssl/key', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload private key');
      }
      
      const { path } = await response.json();
      onKeyUpload(path);
      
      toast({
        title: "Private key uploaded",
        description: "SSL private key uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading key:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload SSL private key",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  // Function to generate self-signed certificate
  const handleGenerateCertificate = async () => {
    setGenerating(true);
    
    try {
      const response = await fetch('/api/settings/ssl/generate', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate certificate');
      }
      
      const data = await response.json();
      
      if (data.success) {
        onCertificateUpload(data.certPath);
        onKeyUpload(data.keyPath);
        
        toast({
          title: "Certificate generated",
          description: "Self-signed SSL certificate generated successfully",
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        title: "Generation failed",
        description: `Failed to generate SSL certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-sentinel-purple" />
          <CardTitle>SSL Configuration</CardTitle>
        </div>
        <CardDescription>
          Upload SSL certificates to enable secure HTTPS connections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="ssl-toggle" className="text-base">Enable HTTPS</Label>
            <p className="text-sm text-muted-foreground">
              Use secure connections for the web interface and API
            </p>
          </div>
          <Switch 
            id="ssl-toggle" 
            checked={sslEnabled}
            onCheckedChange={onToggleSsl}
            disabled={!certPath || !keyPath}
          />
        </div>
        
        <Alert className="bg-sentinel-purple/5 text-sentinel-purple border-sentinel-purple/20">
          <KeyRound className="h-4 w-4" />
          <AlertTitle>Generate or Upload SSL Certificate</AlertTitle>
          <AlertDescription>
            You can generate a self-signed certificate for testing or upload your own SSL certificate and private key.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Button 
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleGenerateCertificate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Lock className="mr-2 h-4 w-4 animate-spin" />
                Generating Certificate...
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                Generate Self-Signed Certificate
              </>
            )}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Certificate Upload */}
          <div className="space-y-2">
            <Label htmlFor="ssl-cert">SSL Certificate</Label>
            <div className="flex flex-col space-y-2">
              <div className="flex">
                <Input
                  ref={certInputRef}
                  id="certificate-upload"
                  type="file"
                  accept=".crt,.pem,.cert"
                  className="hidden"
                  onChange={handleCertUpload}
                />
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => certInputRef.current?.click()}
                  className="w-full"
                  disabled={uploading === 'cert'}
                >
                  {uploading === 'cert' ? (
                    <>
                      <Lock className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Certificate (.crt or .pem)
                    </>
                  )}
                </Button>
              </div>
              {certPath && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="truncate">{certPath.split('/').pop()}</span>
                  <Badge variant="outline" className="ml-auto">Uploaded</Badge>
                </div>
              )}
            </div>
          </div>
          
          {/* Key Upload */}
          <div className="space-y-2">
            <Label htmlFor="ssl-key">SSL Private Key</Label>
            <div className="flex flex-col space-y-2">
              <div className="flex">
                <Input
                  ref={keyInputRef}
                  id="key-upload"
                  type="file"
                  accept=".key,.pem"
                  className="hidden"
                  onChange={handleKeyUpload}
                />
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => keyInputRef.current?.click()}
                  className="w-full"
                  disabled={uploading === 'key'}
                >
                  {uploading === 'key' ? (
                    <>
                      <Lock className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Private Key (.key)
                    </>
                  )}
                </Button>
              </div>
              {keyPath && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="truncate">{keyPath.split('/').pop()}</span>
                  <Badge variant="outline" className="ml-auto">Uploaded</Badge>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {sslEnabled && (!certPath || !keyPath) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mt-4 text-sm flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">SSL certificates required</p>
              <p className="text-amber-700">
                You must upload both a valid SSL certificate and private key before enabling HTTPS.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
