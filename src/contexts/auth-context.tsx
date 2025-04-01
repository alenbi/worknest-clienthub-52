
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Extended User interface to include profile data and role
interface UserWithProfile extends User {
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

  // Function to fetch profile data
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      return null;
    }
  };

  // Function to check if user is admin
  const checkAdminRole = (user: User): boolean => {
    const role = user?.app_metadata?.role;
    return role === 'admin' || user.email === 'support@digitalshopi.in';
  };

  // Function to update the user with profile data
  const updateUserWithProfile = async (currentUser: User) => {
    if (!currentUser) return null;

    const profile = await fetchProfile(currentUser.id);
    const isUserAdmin = checkAdminRole(currentUser);
    
    // Set admin state
    setIsAdmin(isUserAdmin);
    
    if (!isUserAdmin) {
      console.log("Non-admin user detected in admin auth context, redirecting");
      // We need to logout non-admin users trying to use the admin auth context
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
        toast.error("You don't have permission to access the admin area");
      }, 0);
      return null;
    }
    
    const userWithProfile: UserWithProfile = {
      ...currentUser,
      name: profile?.full_name || "",
      avatar: profile?.avatar || "",
      role: isUserAdmin ? 'admin' : 'client'
    };

    return userWithProfile;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        console.log("Initializing admin auth state...");
        
        // Set up auth state listener first to catch any events during initialization
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("Admin auth state changed:", event);
            
            // Only update state if we're initialized to avoid race conditions
            if (authInitialized) {
              setSession(currentSession);
              
              if (currentSession?.user) {
                // Defer profile fetch to avoid Supabase auth deadlocks
                setTimeout(async () => {
                  const enhancedUser = await updateUserWithProfile(currentSession.user);
                  setUser(enhancedUser);
                  setIsLoading(false);
                }, 0);
              } else {
                setUser(null);
                setIsAdmin(false);
                setIsLoading(false);
              }
            }
          }
        );
        
        // Check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Current admin session check:", currentSession ? "Session exists" : "No session");
        setSession(currentSession);
        
        if (currentSession?.user) {
          const enhancedUser = await updateUserWithProfile(currentSession.user);
          setUser(enhancedUser);
          
          // User role check done inside updateUserWithProfile
          setIsAdmin(checkAdminRole(currentSession.user));
        } else {
          setUser(null);
          setIsAdmin(false);
        }
        
        setIsLoading(false);
        setAuthInitialized(true);
        console.log("Auth initialization complete, isAuthenticated:", !!currentSession?.user, "isAdmin:", isAdmin);

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
  }, [navigate]);

  const login = async (email: string, password: string) => {
    console.log("Admin login function called with email:", email);
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Admin login response:", { data, error });

      if (error) {
        throw error;
      }

      // Check if the user is an admin
      if (data.user && !checkAdminRole(data.user)) {
        // If not an admin, log them out immediately
        await supabase.auth.signOut();
        throw new Error("You don't have admin access to this portal");
      }

      // Explicitly update state here for immediate feedback
      if (data.session && checkAdminRole(data.user)) {
        console.log("Setting session and user immediately after admin login");
        setSession(data.session);
        
        // Update user with profile data
        const enhancedUser = await updateUserWithProfile(data.user);
        setUser(enhancedUser);
        setIsAdmin(true);
        
        // Successfully logged in
        toast.success("Successfully signed in as admin!");
      } else {
        throw new Error("You don't have admin access to this portal");
      }
    } catch (error: any) {
      console.error("Login error details:", error);
      toast.error(error.message || "Failed to sign in");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: 'admin' // Only admins should be registering through admin portal
          },
        },
      });

      if (error) throw error;
      
      toast.success("Registration successful! You can now sign in.");
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
      
      // Clean up state - will also be handled by onAuthStateChange,
      // but good to do it explicitly here
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      
      // Redirect to login page after logout
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update user profile
  const updateProfile = async (data: { name?: string; avatar?: string }) => {
    try {
      setIsLoading(true);
      
      if (!user) throw new Error("Not authenticated");
      
      // Update profile in database
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.name,
          avatar: data.avatar,
        })
        .eq("id", user.id);
      
      if (error) throw error;
      
      // Update local user state
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
        isLoading: isLoading && !authInitialized,
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
