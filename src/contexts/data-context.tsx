import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Resource, Video, Offer } from '@/lib/models';

interface AuthContextType {
  session: Session | null;
  user: Session['user'] | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Session['user'] | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });
  }, []);

  const signIn = async (email: string) => {
    try {
      await supabase.auth.signInWithOtp({ email });
      alert('Check your email for the magic link to sign in.');
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface DataContextType {
  session: Session | null;
  user: Session['user'] | null;
  isAdmin: boolean;
  isLoading: boolean;
  
  // Resource management
  createResource: (resource: Partial<Resource>) => Promise<void>;
  updateResource: (id: string, resource: Partial<Resource>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  
  // Video management
  createVideo: (video: Partial<Video>) => Promise<void>;
  updateVideo: (id: string, video: Partial<Video>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  
  // Offer management
  createOffer: (offer: Partial<Offer>) => Promise<void>;
  updateOffer: (id: string, offer: Partial<Offer>) => Promise<void>;
  deleteOffer: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          setIsLoading(true);
          const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching admin status:', error);
            setIsAdmin(false);
          } else {
            setIsAdmin(!!data);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsAdmin(false);
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);
  
  // Resource management functions
  const createResource = async (resource: Partial<Resource>) => {
    try {
      const { error } = await supabase.from('resources').insert(resource);
      if (error) throw error;
    } catch (error) {
      console.error('Error creating resource:', error);
      throw error;
    }
  };

  const updateResource = async (id: string, resource: Partial<Resource>) => {
    try {
      const { error } = await supabase.from('resources').update(resource).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating resource:', error);
      throw error;
    }
  };

  const deleteResource = async (id: string) => {
    try {
      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  };
  
  // Video management functions
  const createVideo = async (video: Partial<Video>) => {
    try {
      const { error } = await supabase.from('videos').insert(video);
      if (error) throw error;
    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  };

  const updateVideo = async (id: string, video: Partial<Video>) => {
    try {
      const { error } = await supabase.from('videos').update(video).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  };
  
  // Offer management functions
  const createOffer = async (offer: Partial<Offer>) => {
    try {
      const { error } = await supabase.from('offers').insert(offer);
      if (error) throw error;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  };

  const updateOffer = async (id: string, offer: Partial<Offer>) => {
    try {
      const { error } = await supabase.from('offers').update(offer).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating offer:', error);
      throw error;
    }
  };

  const deleteOffer = async (id: string) => {
    try {
      const { error } = await supabase.from('offers').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting offer:', error);
      throw error;
    }
  };

  // Add these to the value object passed to the provider
  return (
    <DataContext.Provider
      value={{
        session,
        user,
        isAdmin,
        isLoading,
        createResource,
        updateResource,
        deleteResource,
        createVideo,
        updateVideo,
        deleteVideo,
        createOffer,
        updateOffer,
        deleteOffer,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
