
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useClientAuth } from "@/contexts/client-auth-context";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

const ClientProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useClientAuth();
  const { isAuthenticated: isAdminAuthenticated } = useAuth();
  const location = useLocation();
  
  // Check if trying to access admin routes
  const adminPaths = ['/dashboard', '/clients', '/tasks', '/settings', '/admin', '/updates'];
  const isAdminPath = adminPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  
  // Enforce immediate security check - block access to admin routes
  if (isAdminPath) {
    // If client is authenticated, block and redirect
    if (isAuthenticated && !isAdminAuthenticated) {
      console.log("SECURITY BLOCK: Client trying to access admin path:", location.pathname);
      toast.error("You don't have permission to access admin areas");
      
      return (
        <>
          <Alert variant="destructive" className="max-w-md mx-auto mt-8 mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access this area.
              Redirecting to your dashboard...
            </AlertDescription>
          </Alert>
          <Navigate to="/client/dashboard" replace />
        </>
      );
    }
    
    // If not authenticated as client or admin, redirect to client login
    if (!isAuthenticated && !isAdminAuthenticated && !isLoading) {
      console.log("Not authenticated, redirecting to client login");
      return <Navigate to="/client/login" replace />;
    }
  }

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
  return isAuthenticated ? <Outlet /> : <Navigate to="/client/login" replace />;
};

export default ClientProtectedRoute;
