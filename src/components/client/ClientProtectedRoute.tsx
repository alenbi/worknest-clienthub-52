
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useClientAuth } from "@/contexts/client-auth-context";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const ClientProtectedRoute = () => {
  const { isAuthenticated, isLoading, isClient } = useClientAuth();
  const { isAuthenticated: isAdminAuthenticated, logout: adminLogout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if trying to access admin routes
  const adminPaths = ['/dashboard', '/clients', '/tasks', '/settings', '/admin', '/updates'];
  const isAdminPath = adminPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  
  // Enforce immediate security check - block access to admin routes
  if (isAdminPath) {
    console.log("SECURITY CHECK: Detected attempt to access admin path:", location.pathname);
    
    // Force clean admin sessions
    useEffect(() => {
      const securityCleanup = async () => {
        if (isAdminAuthenticated) {
          console.log("SECURITY ACTION: Logging out admin session");
          await adminLogout();
        }
        
        // Ensure complete session cleanup if needed
        await supabase.auth.signOut();
        toast.error("Access denied. Please log in as client");
        navigate("/client/login", { replace: true });
      };
      
      securityCleanup();
    }, []);

    // Block and redirect
    return (
      <>
        <Alert variant="destructive" className="max-w-md mx-auto mt-8 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access admin areas.
            Redirecting to client login...
          </AlertDescription>
        </Alert>
        <Navigate to="/client/login" replace />
      </>
    );
  }

  // Check client role specifically
  useEffect(() => {
    const validateClientAccess = async () => {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isLoading && session) {
        // Check if it's the admin email trying to access client routes
        if (session.user?.email === 'support@digitalshopi.in') {
          console.log("SECURITY CHECK: Admin user trying to access client routes");
          toast.error("Admins should use the admin portal");
          
          // Force sign out from Supabase auth
          await supabase.auth.signOut();
          
          // Redirect to admin login
          navigate("/login", { replace: true });
        }
      }
    };
    
    validateClientAccess();
  }, [isClient, isLoading, isAuthenticated, navigate]);

  // Only show loading if we're genuinely still checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your account...</p>
      </div>
    );
  }

  // Return outlet only for client who's authenticated and on client routes
  return isAuthenticated && isClient ? <Outlet /> : <Navigate to="/client/login" replace />;
};

export default ClientProtectedRoute;
