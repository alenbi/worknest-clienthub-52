
import { Navigate, Outlet } from "react-router-dom";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

const ClientProtectedRoute = () => {
  const { isAuthenticated, isLoading, isClient } = useClientAuth();
  const [isTimeoutExpired, setIsTimeoutExpired] = useState(false);

  // Add a safety timeout in case authentication hangs
  useEffect(() => {
    // Set a timeout for better UX
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn("Client authentication check timed out after 3s, redirecting to login");
        setIsTimeoutExpired(true);
      }
    }, 3000); // 3 second timeout
    
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Add detailed debug logging
  useEffect(() => {
    console.log("ClientProtectedRoute state:", { 
      isAuthenticated, 
      isLoading, 
      isClient,
      isTimeoutExpired,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, isLoading, isClient, isTimeoutExpired]);

  // If timeout expired or authentication explicitly failed, redirect to login
  if ((isLoading && isTimeoutExpired) || (!isLoading && !isAuthenticated)) {
    console.log("Client not authenticated or timeout expired, redirecting to login", { 
      isLoading, 
      isTimeoutExpired, 
      isAuthenticated, 
      isClient,
      timestamp: new Date().toISOString()
    });
    return <Navigate to="/client/login" replace />;
  }

  // Show loading state while checking authentication (but not if timeout expired)
  if (isLoading && !isTimeoutExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Checking your authentication...</p>
      </div>
    );
  }

  // Only allow access if authenticated and has client role
  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access client areas.
          </AlertDescription>
        </Alert>
        <Navigate to="/client/login" replace />
      </div>
    );
  }

  // If authenticated and is client, render the protected content
  return <Outlet />;
};

export default ClientProtectedRoute;
