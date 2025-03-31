
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const ClientProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useClientAuth();
  const location = useLocation();
  
  // Check if trying to access admin routes
  const adminPaths = ['/dashboard', '/clients', '/tasks', '/settings', '/admin', '/updates'];
  const isAdminPath = adminPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  
  // If authenticated as client but trying to access admin routes, redirect to client dashboard
  if (isAuthenticated && isAdminPath) {
    console.log("Client trying to access admin path:", location.pathname);
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
