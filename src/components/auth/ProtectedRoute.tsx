
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isAuthenticated: isClientAuthenticated } = useClientAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("ProtectedRoute state:", { isAuthenticated, isLoading, isClientAuthenticated });
    
    // If authentication is complete and user is not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      console.log("User not authenticated, redirecting to login");
      navigate("/login", { replace: true });
    }
    
    // If the user is authenticated but is identified as a client, they should be redirected to client pages
    if (!isAuthenticated && isClientAuthenticated) {
      console.log("User is authenticated as client but accessing admin routes, redirecting to client dashboard");
      toast.error("You don't have permission to access the admin area");
      navigate("/client/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, isClientAuthenticated, navigate]);

  // Only show loading if we're genuinely still checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated as a client, they shouldn't access admin routes
  if (isClientAuthenticated && !isAuthenticated) {
    return (
      <>
        <Alert variant="destructive" className="max-w-md mx-auto mt-8 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Client accounts cannot access admin areas.
            Redirecting to client dashboard...
          </AlertDescription>
        </Alert>
        <Navigate to="/client/dashboard" replace />
      </>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
