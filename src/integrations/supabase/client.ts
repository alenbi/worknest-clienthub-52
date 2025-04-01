
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { Request } from '@/lib/models';

const SUPABASE_URL = "https://xmyqiplgjcaxpnojdxmk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhteXFpcGxnamNheHBub2pkeG1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMjQ4MjksImV4cCI6MjA1ODgwMDgyOX0.tzxkW_UrwoRP5P1WI8AtH_L92qXbVRsv8TZK-s3AaFk";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Add RPC function types
declare module '@supabase/supabase-js' {
  interface SupabaseClient<Database> {
    rpc<T extends string>(
      fn: T,
      params?: Record<string, any>
    ): Promise<{ data: any; error: null } | { data: null; error: any }>;
  }
}

// Define our custom RPC function types for type checking
export interface RPCFunctions {
  get_all_requests: () => Promise<{ data: Request[]; error: null } | { data: null; error: any }>;
  get_client_requests: (params: { client_user_id: string }) => Promise<{ data: Request[]; error: null } | { data: null; error: any }>;
  create_client_request: (params: { req_title: string; req_description: string; client_user_id: string }) => Promise<{ data: any; error: null } | { data: null; error: any }>;
  update_request_status: (params: { request_id: string; new_status: string }) => Promise<{ data: any; error: null } | { data: null; error: any }>;
  ensure_admin_role: () => Promise<{ data: any; error: null } | { data: null; error: any }>;
  get_client_id_from_user: (params: { user_id: string }) => Promise<{ data: any; error: null } | { data: null; error: any }>;
  is_admin: (params: { user_id: string }) => Promise<{ data: boolean; error: null } | { data: null; error: any }>;
  is_client: (params: { user_id: string }) => Promise<{ data: boolean; error: null } | { data: null; error: any }>;
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
