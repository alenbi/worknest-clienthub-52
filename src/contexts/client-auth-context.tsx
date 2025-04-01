
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Extended User interface to include profile data
interface ClientUserWithProfile {
  id: string;
  email?: string | null;
  user_metadata: {
    [key: string]: any;
  };
  created_at: string;
  name?: string;
  company?: string;
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
  const [isClient, setIsClient] = useState(false);
  const navigate = useNavigate();

  // Function to check if user is a client
  const checkClientRole = async (currentUser: User): Promise<boolean> => {
    if (!currentUser) return false;
    if (currentUser.email === 'support@digitalshopi.in') return false;
    
    try {
      const { data, error } = await supabase.rpc('is_client', { user_id: currentUser.id });
      if (error) {
        console.error("Error checking client role:", error);
        return currentUser.email !== 'support@digitalshopi.in';
      }
      return !!data;
    } catch (error) {
      console.error("Failed to check client role:", error);
      return currentUser.email !== 'support@digitalshopi.in';
    }
  };

  // Function to update the user with client data
  const updateUserWithClientData = async (currentUser: User): Promise<ClientUserWithProfile | null> => {
    if (!currentUser) return null;
    
    try {
      const isUserClient = await checkClientRole(currentUser);
      
      if (!isUserClient) {
        console.log("Admin user detected in client auth context");
        return null;
      }

      // Fetch client data from the database
      const { data: clientData, error } = await supabase
        .from("clients")
        .select("name, company")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching client data:", error);
        return {
          id: currentUser.id,
          email: currentUser.email,
          user_metadata: currentUser.user_metadata,
          created_at: currentUser.created_at,
          role: 'client'
        };
      }
      
      return {
        id: currentUser.id,
        email: currentUser.email,
        user_metadata: currentUser.user_metadata,
        created_at: currentUser.created_at,
        name: clientData?.name || "",
        company: clientData?.company || "",
        role: 'client'
      };
    } catch (error) {
      console.error("Error in updateUserWithClientData:", error);
      return {
        id: currentUser.id,
        email: currentUser.email,
        user_metadata: currentUser.user_metadata,
        created_at: currentUser.created_at,
        role: 'client'
      };
    }
  };

  useEffect(() => {
    console.log("ClientAuthProvider mounted");
    let mounted = true;
    let authTimeout: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        console.log("Initializing client auth context...");
        
        // First set up the onAuthStateChange listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("Client auth state changed:", event, "with session:", !!currentSession);
            
            if (!mounted) return;
            
            if (event === 'SIGNED_OUT') {
              setSession(null);
              setUser(null);
              setIsClient(false);
              console.log("User signed out, cleared auth state");
            } 
            else if (currentSession?.user) {
              console.log("Session detected in auth change event");
              
              // Use setTimeout to prevent deadlocks
              setTimeout(async () => {
                if (!mounted) return;
                
                try {
                  const isUserClient = await checkClientRole(currentSession.user);
                  
                  if (isUserClient) {
                    console.log("Client user authenticated");
                    setSession(currentSession);
                    const enhancedUser = await updateUserWithClientData(currentSession.user);
                    setUser(enhancedUser);
                    setIsClient(true);
                  } else {
                    console.log("Admin user detected, clearing client auth state");
                    setSession(null);
                    setUser(null);
                    setIsClient(false);
                  }
                } catch (error) {
                  console.error("Error processing auth state change:", error);
                } finally {
                  if (mounted) setIsLoading(false);
                }
              }, 0);
            } else {
              if (mounted) setIsLoading(false);
            }
          }
        );
        
        // Then check for existing session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          if (mounted) setIsLoading(false);
          return subscription;
        }
        
        const currentSession = data.session;
        console.log("Current client session check:", !!currentSession);
        
        if (currentSession?.user && mounted) {
          try {
            const isUserClient = await checkClientRole(currentSession.user);
            
            if (isUserClient) {
              console.log("Client user session found");
              setSession(currentSession);
              const enhancedUser = await updateUserWithClientData(currentSession.user);
              setUser(enhancedUser);
              setIsClient(true);
            } else {
              console.log("Admin session found in client context, clearing");
              setSession(null);
              setUser(null);
              setIsClient(false);
            }
          } catch (error) {
            console.error("Error processing existing session:", error);
          }
        } else {
          console.log("No valid client session found");
        }
        
        // Add shorter timeout as a safety measure
        authTimeout = setTimeout(() => {
          if (mounted && isLoading) {
            console.warn("Client auth initialization timed out after 2s");
            setIsLoading(false);
          }
        }, 2000);
        
        if (mounted) {
          setIsLoading(false);
          console.log("Client auth initialization complete");
        }

        return subscription;
      } catch (error) {
        console.error("Error initializing client auth:", error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setIsClient(false);
          setIsLoading(false);
        }
        return null;
      }
    };

    const subscription = initializeAuth();
    
    return () => {
      console.log("ClientAuthProvider unmounting");
      mounted = false;
      if (authTimeout) clearTimeout(authTimeout);
      subscription.then(sub => {
        if (sub) sub.unsubscribe();
      });
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log("Client login function called with email:", email);
    try {
      setIsLoading(true);
      
      // Block admin email from logging in through client portal
      if (email.toLowerCase() === 'support@digitalshopi.in') {
        throw new Error("Admin users should use the admin login");
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        // Double check this is not the admin
        const isUserClient = await checkClientRole(data.user);
        
        if (!isUserClient) {
          // Force logout if admin tried to login as client
          await supabase.auth.signOut();
          throw new Error("Admin users should use the admin login");
        }
        
        setSession(data.session);
        const enhancedUser = await updateUserWithClientData(data.user);
        setUser(enhancedUser);
        setIsClient(true);
        
        toast.success("Successfully signed in!");
        navigate("/client/dashboard");
      } else {
        throw new Error("Failed to authenticate");
      }
    } catch (error: any) {
      setUser(null);
      setSession(null);
      setIsClient(false);
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
      
      console.log("Client logged out successfully");
      navigate("/client/login");
    } catch (error: any) {
      console.error("Logout error:", error);
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
