
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Loader2 } from "lucide-react";

const ClientProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useClientAuth();
  const location = useLocation();
  
  // Check if trying to access admin routes
  const adminPaths = ['/dashboard', '/clients', '/tasks', '/settings', '/admin'];
  const isAdminPath = adminPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  
  // If authenticated as client but trying to access admin routes, redirect to client dashboard
  if (isAuthenticated && isAdminPath) {
    console.log("Client trying to access admin path:", location.pathname);
    return <Navigate to="/client/dashboard" replace />;
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
