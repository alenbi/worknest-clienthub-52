import { useState, useEffect } from "react";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DEBUG_AUTH = true;

const ClientLogin = () => {
  const { login, isAuthenticated, isLoading, isClient } = useClientAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const [isRedirected, setIsRedirected] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (DEBUG_AUTH) console.log("ClientLogin - Session check:", !!session, session?.user?.email);
        setSessionChecked(true);
      } catch (err) {
        console.error("Error checking session:", err);
        setSessionChecked(true);
      }
    };
    
    checkExistingSession();
  }, []);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setIsRedirected(true);
      setIsSubmitting(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (DEBUG_AUTH) {
      console.log("ClientLogin auth state:", { 
        isAuthenticated, 
        isClient, 
        isLoading, 
        sessionChecked,
        timestamp: new Date().toISOString() 
      });
    }
  }, [isAuthenticated, isClient, isLoading, sessionChecked]);

  if (sessionChecked && isAuthenticated && isClient && !isLoading) {
    if (DEBUG_AUTH) console.log("Already authenticated as client, redirecting to dashboard");
    return <Navigate to="/client/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    try {
      setError("");
      setIsSubmitting(true);
      
      if (email.toLowerCase() === 'support@digitalshopi.in') {
        throw new Error("Admin users should use the admin login");
      }
      
      if (DEBUG_AUTH) console.log(`Attempting to login with email: ${email} and password length: ${password.length}`);
      
      await login(email, password);
      
      if (DEBUG_AUTH) console.log("Login successful, forcing navigation to dashboard");
      navigate("/client/dashboard", { replace: true });
    } catch (error: any) {
      console.error("Client login error:", error);
      setError(error?.message || "Failed to sign in");
      toast.error(error?.message || "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Client Portal</CardTitle>
          <CardDescription>
            Sign in to access your client dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {isRedirected && (
              <div className="rounded-md bg-blue-100 p-3 text-sm text-blue-800">
                Please log in with your client credentials
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/client/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            <div className="text-center text-sm">
              Looking for admin access?{" "}
              <Link to="/login" className="font-medium text-primary">
                Go to admin login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ClientLogin;
