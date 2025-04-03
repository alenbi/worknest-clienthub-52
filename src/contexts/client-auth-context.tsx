
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClientUser } from '@/lib/types';

interface ClientAuthContextType {
  user: ClientUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isClient: boolean;
  clientId: string | null;
  clientName: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshClientData: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const navigate = useNavigate();

  console.log("Initializing client auth context...");

  // Set up auth state change listener
  useEffect(() => {
    console.log("Setting up auth state change listener");
    
    // First set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Client auth state changed:", event, newSession ? "session exists" : "no session");
        
        setSession(newSession);
        if (newSession?.user) {
          setUser(newSession.user as ClientUser);
          
          // On sign in, fetch client data
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              refreshClientData();
            }, 0);
          }
        } else {
          setUser(null);
          setIsClient(false);
          setClientId(null);
          setClientName(null);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Current session check:", currentSession ? "Session exists" : "No session");
      
      setSession(currentSession);
      if (currentSession?.user) {
        setUser(currentSession.user as ClientUser);
        refreshClientData();
      } else {
        setIsLoading(false);
      }
    });

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Verify client status and fetch client data
  const refreshClientData = async () => {
    try {
      console.log("Refreshing client data...");
      
      if (!user) {
        console.log("No user logged in, skipping client data refresh");
        setIsLoading(false);
        return;
      }
      
      const standardEmail = user.email?.trim().toLowerCase();
      console.log("Checking client status for:", standardEmail);
      
      // Use the RPC function to get client data by email
      const { data, error } = await supabase.rpc(
        'get_client_by_email',
        { email_param: standardEmail }
      );
      
      if (error) {
        console.error("Error fetching client:", error);
        setIsClient(false);
        setClientId(null);
        setClientName(null);
        setIsLoading(false);
        return;
      }
      
      console.log("Client data result:", data);
      
      if (data && data.length > 0) {
        const clientData = data[0];
        
        // Update user object with client properties
        const clientUser = { ...user } as ClientUser;
        clientUser.name = clientData.name;
        clientUser.company = clientData.company;
        clientUser.client_id = clientData.id;
        setUser(clientUser);
        
        setIsClient(true);
        setClientId(clientData.id);
        setClientName(clientData.name);
        
        // If client record exists but user_id is not set, update it
        if (!clientData.user_id) {
          console.log("Client record found but user_id is not set, updating...");
          const { error: updateError } = await supabase
            .from('clients')
            .update({ user_id: user.id })
            .eq('id', clientData.id);
            
          if (updateError) {
            console.error("Error updating client user_id:", updateError);
          } else {
            console.log("Updated client record with user_id");
          }
        }
      } else {
        console.log("No client record found for email:", standardEmail);
        setIsClient(false);
        setClientId(null);
        setClientName(null);
      }
    } catch (error) {
      console.error("Error refreshing client data:", error);
      setIsClient(false);
      setClientId(null);
      setClientName(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      console.log("Client login attempt for:", email);
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Login is successful at this point, refreshClientData will be called by auth state change
      console.log("Login successful");
      
    } catch (error: any) {
      console.error("Client login error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/client/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to sign out");
    }
  };

  const value = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    isClient,
    clientId,
    clientName,
    login,
    logout,
    refreshClientData
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
}
