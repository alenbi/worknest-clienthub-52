
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

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
            className="w-full py-6 text-lg"
            onClick={() => navigate('/login')}
          >
            Admin Login
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
            className="w-full py-6 text-lg"
            onClick={() => navigate('/client/login')}
          >
            Client Login
          </Button>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Need assistance? Contact our support team</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Add a note about Supabase auth configuration for the developer */}
      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 p-2 rounded max-w-xs text-xs">
        <p className="font-bold">Developer Note:</p>
        <p>Remember to configure Supabase redirect URLs:</p>
        <p>Go to Authentication → URL Configuration and add your app URL (and localhost for testing).</p>
      </div>
    </div>
  );
};

export default Index;
