
import { User as SupabaseUser } from '@supabase/supabase-js';

// Extend the User type to include client-specific properties
export interface ClientUser extends SupabaseUser {
  name?: string;
  company?: string;
  email?: string;
}
