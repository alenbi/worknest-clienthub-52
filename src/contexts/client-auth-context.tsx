
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientAuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
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
        setUser(newSession?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setIsClient(false);
          setClientId(null);
          setClientName(null);
        }
        
        // If event is SIGNED_IN, we'll fetch the client data after a small delay
        // to avoid potential race conditions
        if (event === 'SIGNED_IN' && newSession?.user) {
          setTimeout(() => {
            refreshClientData();
          }, 0);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Current session check:", currentSession ? "Session exists" : "No session");
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
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
      
      // Use RPC to get client by email
      const { data, error } = await supabase
        .rpc('get_client_by_email', { email_param: standardEmail });
      
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
        const clientRecord = data[0];
        setIsClient(true);
        setClientId(clientRecord.id);
        setClientName(clientRecord.name);
        
        // If client record exists but user_id is not set, update it
        if (!clientRecord.user_id) {
          console.log("Client record found but user_id is not set, updating...");
          const { error: updateError } = await supabase
            .from('clients')
            .update({ user_id: user.id })
            .eq('id', clientRecord.id);
            
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
      
      const standardEmail = email.trim().toLowerCase();
      
      // First, check if the email exists in the clients table
      const { data: clientData, error: clientError } = await supabase
        .rpc('get_client_by_email', { email_param: standardEmail });
        
      if (clientError) {
        console.error("Error checking if client exists:", clientError);
        throw new Error("Error checking client account, please try again");
      }
      
      if (!clientData || clientData.length === 0) {
        console.error("No client account found with email:", standardEmail);
        throw new Error("No client account found with this email. Please contact support.");
      }
      
      console.log("Client record found:", clientData);
      
      // Now attempt login with Supabase Auth
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: standardEmail,
        password
      });
      
      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          throw new Error("Incorrect password. Please try again.");
        }
        throw signInError;
      }
      
      // At this point, login is successful
      console.log("Client login successful");
      
      // RefreshClientData will be called automatically by the onAuthStateChange listener
      navigate('/client/dashboard');
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
