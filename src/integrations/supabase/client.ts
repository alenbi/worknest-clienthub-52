// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://xmyqiplgjcaxpnojdxmk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhteXFpcGxnamNheHBub2pkeG1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMjQ4MjksImV4cCI6MjA1ODgwMDgyOX0.tzxkW_UrwoRP5P1WI8AtH_L92qXbVRsv8TZK-s3AaFk";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: localStorage
  }
});

// Utility functions for common database operations
export async function fetchRequestsWithClientInfo() {
  try {
    // Use the RPC function to get all requests with client info
    const { data, error } = await supabase
      .rpc('get_all_requests_with_client_info');
    
    if (error) {
      console.error("Error fetching requests:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Failed to fetch requests with client info:", error);
    throw error;
  }
}

export async function fetchClientRequests(clientId: string) {
  try {
    console.log("Fetching requests for client ID:", clientId);
    
    // Use the RPC function to get client requests
    const { data, error } = await supabase
      .rpc('get_client_requests', { client_id_param: clientId });
    
    if (error) {
      console.error("Error fetching client requests:", error);
      throw error;
    }
    
    console.log("Fetched client requests:", data);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch client requests:", error);
    throw error;
  }
}

export async function createClientRequest(clientId: string, title: string, description: string) {
  try {
    console.log("Creating request for client ID:", clientId);
    
    const { data, error } = await supabase
      .from('requests')
      .insert({
        client_id: clientId,
        title,
        description,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (error) {
      console.error("Error creating client request:", error);
      throw error;
    }
    
    console.log("Created client request:", data);
    return data;
  } catch (error) {
    console.error("Failed to create client request:", error);
    throw error;
  }
}

export async function updateRequestStatus(requestId: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('requests')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select('*')
      .single();
    
    if (error) {
      console.error("Error updating request status:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Failed to update request status:", error);
    throw error;
  }
}

// Improved function to check if email already exists as client
export async function checkEmailExists(email: string): Promise<boolean> {
  if (!email) return false;
  
  try {
    const standardEmail = email.trim().toLowerCase();
    console.log("Checking if email exists:", standardEmail);
    
    // First check in clients table
    const { data: clientData, error: clientError } = await supabase
      .rpc('get_client_by_email', { email_param: standardEmail });
      
    if (clientError) {
      console.error("Error checking client email:", clientError);
    }
    
    if (clientData && clientData.length > 0) {
      console.log("Email exists in clients table:", standardEmail);
      return true;
    }
    
    // Also check in auth.users via RPC (since we can't query auth.users directly)
    try {
      const { data: authCheck, error: authCheckError } = await supabase
        .rpc('check_email_exists', { email_to_check: standardEmail });
        
      if (authCheckError) {
        console.error("Error checking auth email:", authCheckError);
      }
      
      if (authCheck === true) {
        console.log("Email exists in auth.users table:", standardEmail);
        return true;
      }
    } catch (err) {
      console.error("RPC check_email_exists failed:", err);
      // Continue even if this check fails
    }
    
    console.log("Email does not exist:", standardEmail);
    return false;
  } catch (error) {
    console.error("Error checking if email exists:", error);
    return false;
  }
}

// Enhanced function to create a client with an authentication user in one operation
export async function createClientWithAuth(name: string, email: string, password: string, company?: string, phone?: string, domain?: string) {
  try {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }
    
    console.log("Creating client with auth for:", email);
    
    // First, standardize the email
    const standardEmail = email.trim().toLowerCase();
    
    // Check if email already exists as a client
    const emailExists = await checkEmailExists(standardEmail);
    if (emailExists) {
      throw new Error("A client with this email already exists");
    }
    
    console.log("Email check passed, proceeding with auth user creation");
    
    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: standardEmail,
      password,
      options: {
        data: {
          role: 'client',
          name
        }
      }
    });
    
    if (authError) {
      console.error("Error creating auth user:", authError);
      throw authError;
    }
    
    if (!authData.user) {
      throw new Error("Auth user creation failed - no user returned");
    }
    
    const userId = authData.user.id;
    console.log("Auth user created with ID:", userId);
    
    // Create the client record linked to the auth user
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert({
        name,
        email: standardEmail,
        company,
        phone,
        domain,
        user_id: userId
      })
      .select('*')
      .single();
      
    if (clientError) {
      console.error("Error creating client record:", clientError);
      throw clientError;
    }
    
    console.log("Client record created successfully:", clientData);
    
    return { client: clientData, user_id: userId };
  } catch (error) {
    console.error("Failed to create client with auth:", error);
    throw error;
  }
}

// Get client by email - useful for login flows
export async function getClientByEmail(email: string) {
  if (!email) return null;
  
  try {
    const standardEmail = email.trim().toLowerCase();
    console.log("Getting client by email:", standardEmail);
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', standardEmail)
      .maybeSingle();
      
    if (error) {
      console.error("Error getting client by email:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Failed to get client by email:", error);
    throw error;
  }
}

// Link existing auth user to client record if needed
export async function linkAuthUserToClient(userId: string, email: string) {
  if (!userId || !email) return null;
  
  try {
    const standardEmail = email.trim().toLowerCase();
    console.log("Linking auth user to client:", userId, standardEmail);
    
    // Find client by email
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('email', standardEmail)
      .maybeSingle();
      
    if (clientError) {
      console.error("Error finding client by email:", clientError);
      throw clientError;
    }
    
    if (!client) {
      console.error("No client found with email:", standardEmail);
      return null;
    }
    
    // Update client with user_id if not already set
    if (!client.user_id) {
      console.log("Updating client with user_id:", userId);
      
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update({ user_id: userId })
        .eq('id', client.id)
        .select('*')
        .single();
        
      if (updateError) {
        console.error("Error updating client with user_id:", updateError);
        throw updateError;
      }
      
      console.log("Client updated successfully:", updatedClient);
      return updatedClient;
    }
    
    return client;
  } catch (error) {
    console.error("Failed to link auth user to client:", error);
    throw error;
  }
}
