
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface UserWithProfile {
  id: string;
  email?: string | null;
  user_metadata: {
    [key: string]: any;
  };
  created_at: string;
  name?: string;
  avatar?: string;
  role?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserWithProfile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Function to check if a user is an admin - strictly check for the specific admin email
  const checkAdminRole = (user: User): boolean => {
    console.log("Checking admin role for email:", user.email);
    return user.email === 'support@digitalshopi.in';
  };

  const updateUserWithProfile = async (currentUser: User) => {
    if (!currentUser) return null;

    // Before doing anything else, check if the user is an admin
    const isUserAdmin = checkAdminRole(currentUser);
    console.log("Is user admin?", isUserAdmin);
    setIsAdmin(isUserAdmin);
    
    if (!isUserAdmin) {
      console.log("Non-admin user detected in admin auth context");
      return null;
    }
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar")
        .eq("id", currentUser.id)
        .maybeSingle();
      
      const userWithProfile: UserWithProfile = {
        id: currentUser.id,
        email: currentUser.email,
        user_metadata: currentUser.user_metadata,
        created_at: currentUser.created_at,
        name: profile?.full_name || "",
        avatar: profile?.avatar || "",
        role: 'admin'
      };
  
      return userWithProfile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return {
        id: currentUser.id,
        email: currentUser.email,
        user_metadata: currentUser.user_metadata,
        created_at: currentUser.created_at,
        role: 'admin'
      };
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        console.log("Initializing admin auth context...");
        
        // First, get any existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Current session check:", currentSession ? "Session exists" : "No session");
        
        if (currentSession?.user) {
          const isUserAdmin = checkAdminRole(currentSession.user);
          console.log("User from session - admin check:", isUserAdmin);
          
          if (isUserAdmin) {
            setSession(currentSession);
            const enhancedUser = await updateUserWithProfile(currentSession.user);
            setUser(enhancedUser);
            setIsAdmin(true);
          } else {
            // Not an admin - clear everything
            console.log("Non-admin user detected, clearing auth state");
            setSession(null);
            setUser(null);
            setIsAdmin(false);
          }
        } else {
          // No session - clear everything
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
        
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("Admin auth state changed:", event);
            
            if (currentSession?.user) {
              const isUserAdmin = checkAdminRole(currentSession.user);
              console.log("Auth state change - admin check:", isUserAdmin);
              
              if (isUserAdmin) {
                setSession(currentSession);
                const enhancedUser = await updateUserWithProfile(currentSession.user);
                setUser(enhancedUser);
                setIsAdmin(true);
              } else {
                // Not an admin - clear everything
                console.log("Auth state change - non-admin detected, clearing state");
                setSession(null);
                setUser(null);
                setIsAdmin(false);
              }
            } else {
              // No session in auth state change - clear everything
              setSession(null);
              setUser(null);
              setIsAdmin(false);
            }
          }
        );
        
        setIsLoading(false);
        setAuthInitialized(true);
        console.log("Admin auth initialization complete");

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing auth:", error);
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setIsLoading(false);
        setAuthInitialized(true);
      }
    };

    initializeAuth();
    
    // Safety timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth initialization timed out, forcing completion");
        setIsLoading(false);
        setAuthInitialized(true);
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [navigate]);

  const login = async (email: string, password: string) => {
    console.log("Admin login function called with email:", email);
    try {
      setIsLoading(true);
      
      // Validate that this is the admin email before proceeding
      if (email.toLowerCase() !== 'support@digitalshopi.in') {
        throw new Error("This email is not authorized for admin access");
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        const isUserAdmin = checkAdminRole(data.user);
        
        if (!isUserAdmin) {
          // Extra safety check - should not happen but just in case
          await supabase.auth.signOut();
          throw new Error("This account does not have administrator privileges");
        }
        
        setSession(data.session);
        const enhancedUser = await updateUserWithProfile(data.user);
        setUser(enhancedUser);
        setIsAdmin(true);
        toast.success("Successfully signed in as admin!");
      } else {
        throw new Error("Failed to authenticate");
      }
    } catch (error: any) {
      setUser(null);
      setIsAdmin(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      
      // Only allow registering the admin email
      if (email.toLowerCase() !== 'support@digitalshopi.in') {
        throw new Error("Only the administrator account can be registered here");
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: 'admin'
          },
        },
      });

      if (error) throw error;
      
      toast.success("Admin registration successful! You can now sign in.");
    } catch (error: any) {
      toast.error(error.message || "Failed to register");
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
      
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: { name?: string; avatar?: string }) => {
    try {
      setIsLoading(true);
      
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.name,
          avatar: data.avatar,
        })
        .eq("id", user.id);
      
      if (error) throw error;
      
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          name: data.name || prev.name,
          avatar: data.avatar || prev.avatar,
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
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user && isAdmin,
        isLoading,
        user,
        session,
        login,
        register,
        logout,
        updateProfile,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
