
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminLoading, user: adminUser } = useAuth();
  const { isAuthenticated: isClientAuthenticated, isLoading: isClientLoading } = useClientAuth();
  
  useEffect(() => {
    const checkUserRole = async () => {
      if (!isAdminLoading && !isClientLoading) {
        // Check if admin is authenticated and has admin role
        if (isAdminAuthenticated && adminUser) {
          try {
            const { data: isAdmin } = await supabase.rpc('is_admin', {
              user_id: adminUser.id
            });
            
            if (isAdmin) {
              // User is an admin, go to admin dashboard
              navigate('/dashboard', { replace: true });
              return;
            }
          } catch (error) {
            console.error('Error checking admin status:', error);
          }
        }
        
        // If not admin but client is authenticated, go to client dashboard
        if (isClientAuthenticated) {
          navigate('/client/dashboard', { replace: true });
        } else {
          // No one is authenticated, go to admin login
          navigate('/login', { replace: true });
        }
      }
    };
    
    checkUserRole();
  }, [navigate, isAdminAuthenticated, isClientAuthenticated, isAdminLoading, isClientLoading, adminUser]);

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
