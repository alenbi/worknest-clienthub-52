
import { User } from '@supabase/supabase-js';

export interface ClientUser extends User {
  name?: string;
  company?: string;
  client_id?: string;
}

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
