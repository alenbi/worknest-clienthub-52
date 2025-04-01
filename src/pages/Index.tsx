import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useClientAuth } from "@/contexts/client-auth-context";
import { useEffect } from "react";
import { ArrowRight, User, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  const { isAuthenticated: isClientAuthenticated, isClient } = useClientAuth();

  // Automatically redirect based on authentication status
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Get the current session to check if there's an active session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("Session check:", { 
          hasSession: !!session,
          email: session.user?.email
        });
        
        if (session.user?.email === 'support@digitalshopi.in') {
          if (isAuthenticated && isAdmin) {
            console.log("User is authenticated as admin, redirecting to admin dashboard");
            navigate('/dashboard', { replace: true });
          } else {
            // Admin session exists but admin context not authenticated
            console.log("Admin session detected but context not ready");
            // Let the auth context handle this
          }
        } else {
          if (isClientAuthenticated && isClient) {
            console.log("User is authenticated as client, redirecting to client dashboard");
            navigate('/client/dashboard', { replace: true });
          } else {
            // Client session exists but client context not authenticated
            console.log("Client session detected but context not ready");
            // Let the client auth context handle this
          }
        }
      }
    };
    
    checkAuthAndRedirect();
  }, [isAuthenticated, isClientAuthenticated, isAdmin, isClient, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Digitalshopi</CardTitle>
          <CardDescription>
            Please select your login type to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="default" 
            className="w-full py-6 text-lg flex items-center justify-center gap-2"
            onClick={() => navigate('/login')}
          >
            <User className="h-5 w-5" />
            <span>Admin Login</span>
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full py-6 text-lg flex items-center justify-center gap-2"
            onClick={() => navigate('/client/login')}
          >
            <Building2 className="h-5 w-5" />
            <span>Client Login</span>
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Need assistance? Contact our support team</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Add a note about Supabase configuration */}
      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 p-2 rounded max-w-xs text-xs">
        <p className="font-bold">Developer Note:</p>
        <p>Important: Configure Supabase Site URL and Redirect URLs:</p>
        <p>Site URL: http://localhost:3000</p>
        <p>Redirect URLs: http://localhost:3000/*, http://localhost:5173/*</p>
      </div>
    </div>
  );
};

export default Index;
