
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useClientAuth } from "@/contexts/client-auth-context";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminLoading } = useAuth();
  const { isAuthenticated: isClientAuthenticated, isLoading: isClientLoading } = useClientAuth();
  
  useEffect(() => {
    // Only redirect if both auth states have been determined
    if (!isAdminLoading && !isClientLoading) {
      if (isAdminAuthenticated) {
        // Admin is authenticated, go to admin dashboard
        navigate('/dashboard', { replace: true });
      } else if (isClientAuthenticated) {
        // Client is authenticated, go to client dashboard 
        navigate('/client/dashboard', { replace: true });
      } else {
        // No one is authenticated, go to admin login
        navigate('/login', { replace: true });
      }
    }
  }, [navigate, isAdminAuthenticated, isClientAuthenticated, isAdminLoading, isClientLoading]);

  // Display a loading skeleton while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
};

export default Index;
