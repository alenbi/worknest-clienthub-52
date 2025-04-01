
import { Navigate, Outlet } from "react-router-dom";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const ClientProtectedRoute = () => {
  const { isAuthenticated, isLoading, isClient } = useClientAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your account...</p>
      </div>
    );
  }

  // Only allow access if authenticated and has client role
  if (!isAuthenticated || !isClient) {
    return (
      <>
        <Alert variant="destructive" className="max-w-md mx-auto mt-8 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access client areas.
          </AlertDescription>
        </Alert>
        <Navigate to="/client/login" replace />
      </>
    );
  }

  // If authenticated and is client, render the protected content
  return <Outlet />;
};

export default ClientProtectedRoute;
