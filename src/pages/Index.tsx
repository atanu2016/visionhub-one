
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Activity, Shield, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-2rem)] flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-3xl mx-auto mb-10 animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-2xl bg-sentinel-purple/20 backdrop-blur-lg border border-sentinel-purple/30">
            <Camera className="h-10 w-10 text-[hsl(var(--sentinel-purple))]" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">VisionHub One Sentinel</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Advanced surveillance and monitoring solution for your security needs
        </p>
        <Button 
          onClick={() => navigate('/dashboard')} 
          size="lg" 
          className="bg-[hsl(var(--sentinel-purple))] hover:bg-[hsl(var(--sentinel-purple))]/90 text-white rounded-full px-6 transition-all duration-300 hover:shadow-lg hover:shadow-[hsl(var(--sentinel-purple))]/20"
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto animate-fade-in" style={{animationDelay: '0.2s'}}>
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-6">
            <div className="p-3 rounded-full bg-sentinel-status-active/10 w-fit mb-4">
              <Camera className="h-6 w-6 text-[hsl(var(--sentinel-status-active))]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Live Monitoring</h3>
            <p className="text-muted-foreground text-sm">
              View all your cameras in real-time with advanced streaming capabilities.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardContent className="p-6">
            <div className="p-3 rounded-full bg-sentinel-status-warning/10 w-fit mb-4">
              <Activity className="h-6 w-6 text-[hsl(var(--sentinel-status-warning))]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Event Detection</h3>
            <p className="text-muted-foreground text-sm">
              Intelligent motion and object detection with customizable alerts.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardContent className="p-6">
            <div className="p-3 rounded-full bg-sentinel-status-recording/10 w-fit mb-4">
              <Shield className="h-6 w-6 text-[hsl(var(--sentinel-status-recording))]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure Recordings</h3>
            <p className="text-muted-foreground text-sm">
              Encrypted storage and backup of all surveillance recordings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
