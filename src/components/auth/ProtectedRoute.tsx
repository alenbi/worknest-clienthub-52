
import { Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isAuthenticated: isClientAuthenticated, logout: clientLogout } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Immediate security check - if client is authenticated, block admin access immediately
  if (isClientAuthenticated && !isAuthenticated && !isLoading) {
    console.log("SECURITY BLOCK: Client account attempting to access admin route", location.pathname);
    
    // If we detect a client trying to access admin routes directly, log them out of client auth
    // This is a security measure to prevent unauthorized access
    useEffect(() => {
      const handleBlockedAccess = async () => {
        console.log("Logging out client from admin restricted area");
        toast.error("You don't have permission to access the admin area");
        await clientLogout();
      };
      
      handleBlockedAccess();
    }, [clientLogout]);
    
    return (
      <>
        <Alert variant="destructive" className="max-w-md mx-auto mt-8 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Client accounts cannot access admin areas.
            Redirecting to client login...
          </AlertDescription>
        </Alert>
        <Navigate to="/client/login" replace />
      </>
    );
  }

  useEffect(() => {
    console.log("ProtectedRoute state:", { isAuthenticated, isLoading, isClientAuthenticated, path: location.pathname });
    
    // If authentication is complete and user is not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      console.log("User not authenticated, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, isClientAuthenticated, navigate, location.pathname]);

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

  // Perform final check before rendering outlet
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
