
import { Outlet } from "react-router-dom";
import { ClientSidebar } from "./ClientSidebar";
import { ClientHeader } from "./ClientHeader";
import { useEffect, useState } from "react";
import { useClientAuth } from "@/contexts/client-auth-context";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const ClientLayout = () => {
  const { isAuthenticated, isLoading, user } = useClientAuth();
  const navigate = useNavigate();
  const [redirectTimer, setRedirectTimer] = useState<number | null>(null);

  // Ensure client is redirected to login if not authenticated
  useEffect(() => {
    // Clear any existing timer when component unmounts or deps change
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      setRedirectTimer(null);
    }

    // If not loading and not authenticated, redirect immediately
    if (!isLoading && !isAuthenticated) {
      console.log("Client not authenticated, redirecting to login from ClientLayout");
      navigate("/client/login");
      return;
    }
    
    // If still loading, set a timeout to redirect after 2 seconds (reduced from 2.5s)
    if (isLoading) {
      const timer = window.setTimeout(() => {
        if (!isAuthenticated) {
          console.log("Client auth taking too long in ClientLayout, redirecting to login");
          navigate("/client/login");
        }
      }, 2000);
      
      setRedirectTimer(timer);
      
      return () => {
        clearTimeout(timer);
        setRedirectTimer(null);
      };
    }
    
    // Cleanup function to clear timer on unmount
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
        setRedirectTimer(null);
      }
    };
  }, [isAuthenticated, isLoading, navigate, redirectTimer]);

  // Show loading state while authentication status is being determined
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your account...</p>
          <p className="text-xs text-muted-foreground mt-2">Please wait a moment...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything as the redirect will happen
  if (!isAuthenticated) {
    return null;
  }

  // Render normal layout if authenticated
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ClientSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ClientHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
        <footer className="border-t py-2 px-4 text-center text-sm text-muted-foreground">
          Client Portal - {user?.company || "My Account"}
        </footer>
      </div>
    </div>
  );
};

export default ClientLayout;
