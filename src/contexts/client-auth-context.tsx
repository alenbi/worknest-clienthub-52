import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Extended User interface to include profile data
interface ClientUserWithProfile extends User {
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
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();

  // Function to check if user is a client
  const checkClientRole = (user: User): boolean => {
    return user.email !== 'support@digitalshopi.in';
  };

  // Function to update the user with client data
  const updateUserWithClientData = async (currentUser: User) => {
    if (!currentUser) return null;
    
    const isUserClient = checkClientRole(currentUser);
    
    if (!isUserClient) {
      console.log("Admin user detected in client auth context");
      return null;
    }

    try {
      // Fetch client data from the database
      const { data: clientData } = await supabase
        .from("clients")
        .select("name, company")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      
      const clientUserWithProfile: ClientUserWithProfile = {
        ...currentUser,
        name: clientData?.name || "",
        company: clientData?.company || "",
        role: 'client'
      };
  
      return clientUserWithProfile;
    } catch (error) {
      console.error("Error fetching client data:", error);
      return {
        ...currentUser,
        role: 'client'
      };
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        console.log("Initializing client auth context...");
        
        // Set up auth state listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("Client auth state changed:", event);
            
            if (currentSession?.user) {
              // Check if user is a client
              const isUserClient = checkClientRole(currentSession.user);
              
              if (isUserClient) {
                setSession(currentSession);
                const enhancedUser = await updateUserWithClientData(currentSession.user);
                setUser(enhancedUser);
                setIsClient(true);
              } else {
                // Not client - clear auth state in this context
                setSession(null);
                setUser(null);
                setIsClient(false);
              }
            } else {
              // No session
              setSession(null);
              setUser(null);
              setIsClient(false);
            }
            
            setIsLoading(false);
            setAuthInitialized(true);
          }
        );
        
        // Check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Current client session check:", currentSession ? "Session exists" : "No session");
        
        if (currentSession?.user) {
          // Check if user is a client
          const isUserClient = checkClientRole(currentSession.user);
          
          if (isUserClient) {
            setSession(currentSession);
            const enhancedUser = await updateUserWithClientData(currentSession.user);
            setUser(enhancedUser);
            setIsClient(true);
          } else {
            // Not client
            setSession(null);
            setUser(null);
            setIsClient(false);
          }
        } else {
          // No session
          setUser(null);
          setSession(null);
          setIsClient(false);
        }
        
        // Force auth state to be determined after a maximum timeout
        const authTimeoutId = setTimeout(() => {
          if (!authInitialized) {
            console.warn("Client auth initialization timed out");
            setIsLoading(false);
            setAuthInitialized(true);
          }
        }, 4000);
        
        setIsLoading(false);
        console.log("Client auth initialization complete");

        return () => {
          subscription.unsubscribe();
          clearTimeout(authTimeoutId);
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
        const isUserClient = checkClientRole(data.user);
        
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
