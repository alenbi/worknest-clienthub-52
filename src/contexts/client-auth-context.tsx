
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Debug mode - set to false in production
const DEBUG_AUTH = false;

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
      // Check if there's a client record for this user
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', currentUser.id)
        .limit(1);
      
      if (clientError) {
        console.error("Error checking client record:", clientError);
      }
      
      if (clientData && clientData.length > 0) {
        return true;
      }
      
      // Try finding by email if user_id not found
      if (currentUser.email) {
        const { data: clientByEmail, error: emailError } = await supabase
          .from('clients')
          .select('id, name, user_id')
          .eq('email', currentUser.email.toLowerCase())
          .limit(1);
          
        if (emailError) {
          console.error("Error checking client by email:", emailError);
        }
        
        if (clientByEmail && clientByEmail.length > 0) {
          // Update the client record with the user_id if it's missing
          if (!clientByEmail[0].user_id) {
            const { error: updateError } = await supabase
              .from('clients')
              .update({ user_id: currentUser.id })
              .eq('id', clientByEmail[0].id);
              
            if (updateError) {
              console.error("Error updating client user_id:", updateError);
            } else {
              console.log("Updated client record with user_id:", currentUser.id);
            }
          }
          
          return true;
        }
      }
      
      // Fallback to email check
      return currentUser.email !== 'support@digitalshopi.in';
    } catch (error) {
      console.error("Failed to check client role:", error);
      // Fallback to email check
      return currentUser.email !== 'support@digitalshopi.in';
    }
  };

  // Function to update the user with client data
  const updateUserWithClientData = async (currentUser: User): Promise<ClientUserWithProfile | null> => {
    if (!currentUser) return null;
    
    try {
      const isUserClient = await checkClientRole(currentUser);
      
      if (!isUserClient) {
        return null;
      }

      // Fetch client data from the database - first try by user_id
      let { data: clientData, error } = await supabase
        .from("clients")
        .select("name, company")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      
      // If no result, try by email
      if (!clientData && currentUser.email) {
        const { data: clientByEmail, error: emailError } = await supabase
          .from("clients")
          .select("name, company")
          .eq("email", currentUser.email.toLowerCase())
          .maybeSingle();
          
        if (emailError) {
          console.error("Error fetching client data by email:", emailError);
        } else {
          clientData = clientByEmail;
        }
      }
      
      if (error) {
        console.error("Error fetching client data:", error);
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
    let mounted = true;
    let authTimeout: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        // First set up the onAuthStateChange listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, currentSession) => {
            if (DEBUG_AUTH) console.log("Client auth state changed:", event);
            
            if (!mounted) return;
            
            if (event === 'SIGNED_OUT') {
              setSession(null);
              setUser(null);
              setIsClient(false);
            } 
            else if (currentSession?.user) {
              // Use setTimeout to prevent deadlocks
              setTimeout(async () => {
                if (!mounted) return;
                
                try {
                  const isUserClient = await checkClientRole(currentSession.user);
                  
                  if (isUserClient) {
                    setSession(currentSession);
                    const enhancedUser = await updateUserWithClientData(currentSession.user);
                    setUser(enhancedUser);
                    setIsClient(true);
                  } else {
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
        
        if (currentSession?.user && mounted) {
          try {
            const isUserClient = await checkClientRole(currentSession.user);
            
            if (isUserClient) {
              setSession(currentSession);
              const enhancedUser = await updateUserWithClientData(currentSession.user);
              setUser(enhancedUser);
              setIsClient(true);
            } else {
              setSession(null);
              setUser(null);
              setIsClient(false);
            }
          } catch (error) {
            console.error("Error processing existing session:", error);
          }
        }
        
        // Add shorter timeout as a safety measure
        authTimeout = setTimeout(() => {
          if (mounted && isLoading) {
            setIsLoading(false);
          }
        }, 2000);
        
        if (mounted) {
          setIsLoading(false);
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
      mounted = false;
      if (authTimeout) clearTimeout(authTimeout);
      subscription.then(sub => {
        if (sub) sub.unsubscribe();
      });
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Block admin email from logging in through client portal
      if (email.toLowerCase() === 'support@digitalshopi.in') {
        throw new Error("Admin users should use the admin login");
      }
      
      // First check if this user has a client record
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, user_id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      if (clientError) {
        console.error("Error checking client record:", clientError);
      }
      
      if (!clientData) {
        throw new Error("No client account found with this email. Please contact support.");
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
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
        
        // If the client record exists but has no user_id, update it now
        if (clientData && !clientData.user_id) {
          const { error: updateError } = await supabase
            .from('clients')
            .update({ user_id: data.user.id })
            .eq('id', clientData.id);
            
          if (updateError) {
            console.error("Error updating client user_id:", updateError);
          }
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
