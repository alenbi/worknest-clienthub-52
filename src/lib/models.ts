
import { User } from '@supabase/supabase-js';

// User with client information
export interface ClientUser extends User {
  name?: string;
  company?: string;
  client_id?: string;
}

// Client data model
export interface ClientData {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  domain: string | null;
  user_id: string | null;
  created_at?: string;
  updated_at?: string;
}

// Request model
export interface Request {
  id: string;
  client_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  
  // Additional fields for admin view (from join with clients table)
  client_name?: string;
  client_email?: string;
  client_company?: string;
}
