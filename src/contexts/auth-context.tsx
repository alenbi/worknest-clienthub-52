
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export interface AuthUser extends User {
  name?: string;
  avatar?: string;
}

interface AuthContextType {
  session: Session | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const setAuthData = (newSession: Session | null) => {
      setSession(newSession);
      
      if (newSession?.user) {
        const authUser: AuthUser = {
          ...newSession.user,
          name: newSession.user.user_metadata?.name || '',
          avatar: newSession.user.user_metadata?.avatar || ''
        };
        setUser(authUser);
      } else {
        setUser(null);
      }
      
      const userEmail = newSession?.user?.email?.toLowerCase();
      setIsAdmin(userEmail === 'support@digitalshopi.in');
      
      setIsLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthData(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setAuthData(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setSession(data.session);
      setUser(data.user);
      queryClient.invalidateQueries();
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      queryClient.clear();
      navigate('/login');
    } catch (error: any) {
      console.error('Logout failed:', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      setSession(data.session);
      setUser(data.user);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Signup failed:', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });
      if (error) throw error;
      setSession(data.session);
      
      if (data.user) {
        const authUser: AuthUser = {
          ...data.user,
          name: name
        };
        setUser(authUser);
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration failed:', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: { name?: string; avatar?: string }) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: data.name,
          avatar: data.avatar
        }
      });
      
      if (error) throw error;
      
      if (user) {
        setUser({
          ...user,
          name: data.name || user.name,
          avatar: data.avatar || user.avatar
        });
      }
      
    } catch (error: any) {
      console.error('Profile update failed:', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    isAdmin,
    isAuthenticated: !!session,
    login,
    logout,
    signUp,
    register,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
