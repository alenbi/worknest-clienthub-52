
import { useState, useEffect } from "react";
import { useClientAuth } from "@/contexts/client-auth-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ClientLogin = () => {
  const { login, isAuthenticated, isLoading, isClient } = useClientAuth();
  const { isAuthenticated: isAdminAuthenticated, logout: adminLogout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Security check - detect existing admin session and force logout
  useEffect(() => {
    const securityCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const role = session.user?.app_metadata?.role || 
                    session.user?.raw_app_meta_data?.role;
                    
        const isUserAdmin = role === 'admin' || 
                          session.user?.email === 'support@digitalshopi.in';
        
        console.log("Client login security check:", { 
          hasSession: !!session, 
          isUserAdmin, 
          isAdminAuthenticated 
        });
        
        // If admin session exists, but trying to access client login - force logout
        if (isUserAdmin && session) {
          console.log("Found existing admin session, logging out to prevent conflicts");
          await supabase.auth.signOut();
          if (isAdminAuthenticated) {
            await adminLogout();
          }
          toast.info("Logged out of admin session for security");
        }
      }
    };
    
    securityCheck();
  }, [isAdminAuthenticated, adminLogout]);
  
  // Effect to handle redirect after authentication changes
  useEffect(() => {
    if (isAuthenticated && isClient && !isLoading) {
      console.log("Client is authenticated, redirecting to client dashboard");
      navigate("/client/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, isClient]);

  // Regular redirect check (still useful for initial load)
  if (isAuthenticated && isClient && !isLoading) {
    console.log("Rendering redirect to client dashboard");
    return <Navigate to="/client/dashboard" />;
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
      
      // Block admin email from logging in through client portal
      if (email === 'support@digitalshopi.in') {
        throw new Error("Admin users should use the admin login");
      }
      
      await login(email, password);
      // Navigation is handled by the useEffect above
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
              disabled={isSubmitting || isLoading}
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
