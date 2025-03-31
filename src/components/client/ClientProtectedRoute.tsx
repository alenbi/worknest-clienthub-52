
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useClientAuth } from "@/contexts/client-auth-context";
import { useEffect } from "react";

const ClientProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useClientAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("ClientProtectedRoute state:", { isAuthenticated, isLoading });
    
    // If authentication is complete and user is not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      console.log("Client not authenticated, redirecting to client login");
      navigate("/client/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Only show loading if we're genuinely still checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/client/login" replace />;
};

export default ClientProtectedRoute;
