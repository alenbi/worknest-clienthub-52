
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [isTimeoutExpired, setIsTimeoutExpired] = useState(false);

  // Add a safety timeout in case authentication hangs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn("Authentication check timed out, showing access denied");
        setIsTimeoutExpired(true);
      }
    }, 8000); // 8 seconds timeout
    
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show loading state while checking authentication
  if (isLoading && !isTimeoutExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  // Only allow access if authenticated and has admin role
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access admin areas.
          </AlertDescription>
        </Alert>
        <Navigate to="/login" replace />
      </div>
    );
  }

  // If authenticated and is admin, render the protected content
  return <Outlet />;
};

export default ProtectedRoute;
