
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Extended User interface to include profile data
interface ClientUserWithProfile extends User {
  name?: string;
  company?: string;
  id: string; // Ensure id is required
  role?: string;
}

interface ClientAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: ClientUserWithProfile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile?: (data: { name?: string; company?: string }) => Promise<void>;
  isClient: boolean;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const ClientAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ClientUserWithProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const navigate = useNavigate();

  // Function to check if user is a client
  const checkClientRole = (user: User): boolean => {
    const role = user?.app_metadata?.role;
    return role === 'client' || (user.email !== 'support@digitalshopi.in');
  };

  // Function to fetch client data
  const fetchClientData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching client data:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch client data:", error);
      return null;
    }
  };

  // Function to update the user with client data
  const updateUserWithClientData = async (currentUser: User) => {
    if (!currentUser) return null;
    
    const isUserClient = checkClientRole(currentUser);
    setIsClient(isUserClient);
    
    if (!isUserClient) {
      console.log("Admin user detected in client auth context, redirecting");
      // We need to logout admin users trying to use the client auth context
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/client/login");
        toast.error("Admins should use the admin login");
      }, 0);
      return null;
    }

    const clientData = await fetchClientData(currentUser.id);
    
    if (!clientData && isUserClient) {
      console.warn("User is a client but has no client data record:", currentUser.id);
      // This is a client user with no client record - might be a new user
      // Could handle this by creating a client record or showing an onboarding process
    }
    
    const clientUserWithProfile: ClientUserWithProfile = {
      ...currentUser,
      name: clientData?.name || "",
      company: clientData?.company || "",
      role: 'client'
    };

    return clientUserWithProfile;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        console.log("Initializing client auth state...");
        
        // Set up auth state listener first to catch any events during initialization
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("Client auth state changed:", event);
            
            // Only update state if we're initialized to avoid race conditions
            if (authInitialized) {
              setSession(currentSession);
              
              if (currentSession?.user) {
                // Defer profile fetch to avoid Supabase auth deadlocks
                setTimeout(async () => {
                  const enhancedUser = await updateUserWithClientData(currentSession.user);
                  setUser(enhancedUser);
                  setIsLoading(false);
                }, 0);
              } else {
                setUser(null);
                setIsClient(false);
                setIsLoading(false);
              }
            }
          }
        );
        
        // Check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Current client session check:", currentSession ? "Session exists" : "No session");
        setSession(currentSession);
        
        if (currentSession?.user) {
          const enhancedUser = await updateUserWithClientData(currentSession.user);
          setUser(enhancedUser);
          
          // User role check done inside updateUserWithClientData
          setIsClient(checkClientRole(currentSession.user));
        } else {
          setUser(null);
          setIsClient(false);
        }
        
        setIsLoading(false);
        setAuthInitialized(true);
        console.log("Client auth initialization complete, isAuthenticated:", !!currentSession?.user, "isClient:", isClient);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing client auth:", error);
        setUser(null);
        setSession(null);
        setIsClient(false);
        setIsLoading(false);
        setAuthInitialized(true);
      }
    };

    initializeAuth();
  }, [navigate]);

  const login = async (email: string, password: string) => {
    console.log("Client login function called with email:", email);
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Client login response:", { data, error });

      if (error) {
        throw error;
      }

      // Check if the user is not the admin
      if (data.user && data.user.email === 'support@digitalshopi.in') {
        // If it's the admin, log them out immediately
        await supabase.auth.signOut();
        throw new Error("Admin users should use the admin portal");
      }

      // Explicitly update state here for immediate feedback
      if (data.session && checkClientRole(data.user)) {
        console.log("Setting session and user immediately after client login");
        setSession(data.session);
        
        // Update user with profile data
        const enhancedUser = await updateUserWithClientData(data.user);
        setUser(enhancedUser);
        setIsClient(true);
        
        // Successfully logged in
        toast.success("Successfully signed in!");
      } else {
        throw new Error("You don't have access to the client portal");
      }
    } catch (error: any) {
      console.error("Client login error details:", error);
      toast.error(error.message || "Failed to sign in");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clean up state
      setUser(null);
      setSession(null);
      setIsClient(false);
      
      // Redirect to client login page after logout
      navigate("/client/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update client profile
  const updateProfile = async (data: { name?: string; company?: string }) => {
    try {
      setIsLoading(true);
      
      if (!user) throw new Error("Not authenticated");
      
      // Find client record
      const { data: clientData, error: fetchError } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update client record
      const { error } = await supabase
        .from("clients")
        .update({
          name: data.name,
          company: data.company,
        })
        .eq("id", clientData.id);
      
      if (error) throw error;
      
      // Update local user state
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          name: data.name || prev.name,
          company: data.company || prev.company,
        };
      });
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ClientAuthContext.Provider
      value={{
        isAuthenticated: !!user && isClient,
        isLoading,
        user,
        session,
        login,
        logout,
        updateProfile,
        isClient,
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error("useClientAuth must be used within a ClientAuthProvider");
  }
  return context;
};
