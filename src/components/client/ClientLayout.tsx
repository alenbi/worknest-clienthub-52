
import { Outlet } from "react-router-dom";
import { ClientSidebar } from "./ClientSidebar";
import { ClientHeader } from "./ClientHeader";
import { useEffect } from "react";
import { useClientAuth } from "@/contexts/client-auth-context";
import { useNavigate } from "react-router-dom";

const ClientLayout = () => {
  const { isAuthenticated, user } = useClientAuth();
  const navigate = useNavigate();

  // Ensure client is redirected to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/client/login");
    }
  }, [isAuthenticated, navigate]);

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
