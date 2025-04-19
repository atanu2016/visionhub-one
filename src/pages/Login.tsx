
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Shield, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(5, 'Password must be at least 5 characters')
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Get return URL from location state
  const from = location.state?.from?.pathname || '/';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  });

  // Check server status when component mounts
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/status', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // Short timeout to avoid hanging
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      } catch (error) {
        console.error("Server status check failed:", error);
        setServerStatus('offline');
      }
    };
    
    checkServerStatus();
  }, []);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setLoginError(null);
    
    try {
      const success = await login(data.username, data.password);
      if (success) {
        navigate(from, { replace: true });
      } else {
        setLoginError("Login failed. Please check your credentials and try again.");
      }
    } catch (error) {
      console.error("Login submission error:", error);
      setLoginError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/90 p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center pointer-events-none opacity-[0.02]" />
      
      <Card className="w-full max-w-md border-0 shadow-lg bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-2xl bg-sentinel-purple/20 backdrop-blur-lg border border-sentinel-purple/30">
              <Camera className="h-10 w-10 text-[hsl(var(--sentinel-purple))]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access VisionHub Sentinel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {serverStatus === 'offline' && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Server Connection Error</AlertTitle>
              <AlertDescription>
                Unable to connect to the server. The backend service may be down or experiencing issues.
              </AlertDescription>
            </Alert>
          )}
          
          {loginError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Failed</AlertTitle>
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your username" 
                        {...field} 
                        autoComplete="username"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field}
                        autoComplete="current-password"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-[hsl(var(--sentinel-purple))] hover:bg-[hsl(var(--sentinel-purple))]/90" 
                disabled={isSubmitting || serverStatus === 'offline'}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>
          
          {serverStatus === 'offline' && (
            <div className="text-sm text-muted-foreground mt-4">
              <p className="text-center">
                Please check if the backend service is running properly.
                <br/>
                You may need to restart the service.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center px-8 pb-8 pt-0">
          <div className="text-sm text-muted-foreground flex items-center">
            <Shield size={14} className="mr-1" />
            Secure Authentication
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
