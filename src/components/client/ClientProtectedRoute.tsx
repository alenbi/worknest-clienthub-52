
import { Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useClientAuth } from "@/contexts/client-auth-context";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const ClientProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If authentication is complete and user is not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      navigate("/client/login", { replace: true });
    }
    
    // If authenticated as client but trying to access admin routes, redirect to client dashboard
    if (isAuthenticated && !isLoading) {
      const adminPaths = ['/dashboard', '/clients', '/tasks', '/settings', '/admin'];
      const isAdminPath = adminPaths.some(path => location.pathname.startsWith(path));
      
      if (isAdminPath) {
        navigate("/client/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Only show loading if we're genuinely still checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your account...</p>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/client/login" replace />;
};

export default ClientProtectedRoute;
