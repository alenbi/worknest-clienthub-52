
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
    // Clear any existing timer
    if (redirectTimer) {
      clearTimeout(redirectTimer);
    }

    // If not loading and not authenticated, redirect immediately
    if (!isLoading && !isAuthenticated) {
      navigate("/client/login");
      return;
    }
    
    // If still loading, set a timeout to redirect after 4 seconds if still not authenticated
    if (isLoading) {
      const timer = window.setTimeout(() => {
        if (!isAuthenticated) {
          console.log("Client auth taking too long, redirecting to login");
          navigate("/client/login");
        }
      }, 4000);
      
      setRedirectTimer(timer);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading state while authentication status is being determined
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your account...</p>
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
