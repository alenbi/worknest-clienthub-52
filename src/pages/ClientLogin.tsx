
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

// Set to true to enable detailed authentication debugging
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
  const [loginStage, setLoginStage] = useState("init");

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        setLoginStage("checking-session");
        const { data: { session } } = await supabase.auth.getSession();
        if (DEBUG_AUTH) {
          console.log("ClientLogin - Session check:", !!session);
          if (session) {
            console.log("Session user data:", {
              email: session.user?.email,
              id: session.user?.id,
              metadata: session.user?.user_metadata,
              appMetadata: session.user?.app_metadata
            });
          }
        }
        setSessionChecked(true);
        setLoginStage("session-checked");
      } catch (err) {
        console.error("Error checking session:", err);
        setSessionChecked(true);
        setLoginStage("session-check-error");
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
        loginStage,
        timestamp: new Date().toISOString() 
      });
    }
  }, [isAuthenticated, isClient, isLoading, sessionChecked, loginStage]);

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
      setLoginStage("login-started");
      
      if (email.toLowerCase() === 'support@digitalshopi.in') {
        throw new Error("Admin users should use the admin login");
      }
      
      if (DEBUG_AUTH) {
        console.log(`Attempting to login with email: ${email}`);
        // Only log password length for debugging, never the actual password
        console.log(`Password provided with length: ${password.length}`);
      }
      
      // First, try to find the client record to verify this email exists as a client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, user_id, email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      
      if (clientError) {
        console.error("Error checking client record:", clientError);
      }
      
      if (DEBUG_AUTH) {
        if (clientData) {
          console.log("Found client record:", clientData);
          if (!clientData.user_id) {
            console.warn("Client has no linked user_id yet, this may cause issues");
          }
        } else {
          console.warn("No client record found for email:", email);
        }
      }
      
      setLoginStage("attempting-direct-auth");
      
      // Try to login directly with Supabase
      const { data: directAuthData, error: directAuthError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      
      if (directAuthError) {
        console.error("Direct Supabase auth error:", directAuthError);
        setLoginStage("direct-auth-failed");
        
        // Try to get more info about the user to help debug
        if (DEBUG_AUTH) {
          // Check if user exists in auth.users despite login failure
          // Use proper promise handling for the RPC call
          try {
            // Only admins can check if email exists, so this will likely fail for regular users
            const { data: userExists } = await supabase.rpc('check_email_exists', { 
              email_to_check: email.trim().toLowerCase() 
            });
            
            console.log(`User exists check for ${email}: ${userExists ? 'Yes' : 'No'}`);
          } catch (err) {
            console.log("Error checking if email exists:", err);
          }
        }
        
        throw directAuthError;
      }
      
      if (directAuthData.user) {
        if (DEBUG_AUTH) {
          console.log("Direct Supabase auth successful:", directAuthData.user.email);
          console.log("User metadata:", directAuthData.user.user_metadata);
          console.log("User role:", directAuthData.user.app_metadata?.role);
        }
        
        setLoginStage("direct-auth-success");
        
        // If the client record exists but has no user_id, update it now
        if (clientData && !clientData.user_id) {
          if (DEBUG_AUTH) console.log("Updating client record with user_id:", directAuthData.user.id);
          
          const { error: updateError } = await supabase
            .from('clients')
            .update({ user_id: directAuthData.user.id })
            .eq('id', clientData.id);
            
          if (updateError) {
            console.error("Error updating client user_id:", updateError);
          }
        }
      }
      
      setLoginStage("attempting-custom-login");
      
      // Now use our custom login function which handles client role verification
      await login(email.trim().toLowerCase(), password);
      
      setLoginStage("login-successful");
      
      if (DEBUG_AUTH) console.log("Login successful, forcing navigation to dashboard");
      navigate("/client/dashboard", { replace: true });
    } catch (error: any) {
      console.error("Client login error:", error);
      setLoginStage("login-failed");
      
      // Provide more user-friendly error messages
      let errorMessage = "Failed to sign in";
      
      if (error?.message) {
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Note that passwords are case-sensitive.";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Your email is not confirmed. Please check your inbox for confirmation instructions.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
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
            {DEBUG_AUTH && (
              <div className="text-xs text-muted-foreground">
                <p>Stage: {loginStage}</p>
                <p>Auth state: {isAuthenticated ? 'Authenticated' : 'Not authenticated'} | Client: {isClient ? 'Yes' : 'No'}</p>
              </div>
            )}
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
