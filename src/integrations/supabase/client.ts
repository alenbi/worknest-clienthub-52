
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
    detectSessionInUrl: true,
    storage: localStorage
  }
});

// Utility functions for common database operations
export async function fetchRequestsWithClientInfo() {
  try {
    // For admin - get all requests with client info
    const { data: requestsData, error: requestsError } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      throw requestsError;
    }
    
    // Get all clients in a separate query to avoid the permission denied for table users error
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, company');
    
    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      throw clientsError;
    }
    
    // Create a map of client IDs to client data for faster lookup
    const clientsMap = {};
    clientsData.forEach(client => {
      clientsMap[client.id] = client;
    });
    
    // Combine requests with client info
    const enrichedRequests = requestsData.map(request => {
      const clientInfo = clientsMap[request.client_id] || {};
      return {
        ...request,
        client_name: clientInfo.name || 'Unknown',
        client_email: clientInfo.email || 'Unknown',
        client_company: clientInfo.company || 'Unknown'
      };
    });
    
    return enrichedRequests;
  } catch (error) {
    console.error("Failed to fetch requests with client info:", error);
    throw error;
  }
}

export async function fetchClientRequests(clientId: string) {
  try {
    console.log("Fetching requests for client ID:", clientId);
    
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
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
        created_at: new Date().toISOString(),
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
