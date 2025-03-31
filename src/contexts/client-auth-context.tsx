
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";

// Extended User interface to include profile data
interface ClientUserWithProfile extends User {
  name?: string;
  company?: string;
  id: string; // Ensure id is required
}

interface ClientAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: ClientUserWithProfile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile?: (data: { name?: string; company?: string }) => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const ClientAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ClientUserWithProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

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

    const clientData = await fetchClientData(currentUser.id);
    
    const clientUserWithProfile: ClientUserWithProfile = {
      ...currentUser,
      name: clientData?.name || "",
      company: clientData?.company || "",
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
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
        setAuthInitialized(true);
        console.log("Client auth initialization complete, isAuthenticated:", !!currentSession?.user);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing client auth:", error);
        setUser(null);
        setSession(null);
        setIsLoading(false);
        setAuthInitialized(true);
      }
    };

    initializeAuth();
  }, []);

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

      // Explicitly update state here for immediate feedback
      if (data.session) {
        console.log("Setting session and user immediately after client login");
        setSession(data.session);
        
        // Update user with profile data
        const enhancedUser = await updateUserWithClientData(data.user);
        setUser(enhancedUser);
      }

      // Successfully logged in
      toast.success("Successfully signed in!");
      
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
        isAuthenticated: !!user,
        isLoading,
        user,
        session,
        login,
        logout,
        updateProfile,
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
