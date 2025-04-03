
-- Function to check if user owns a client record 
CREATE OR REPLACE FUNCTION public.user_owns_client(client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matching_client_id UUID;
BEGIN
  -- Get the client ID for the current user
  SELECT id INTO matching_client_id
  FROM public.clients
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Return true if the client_id matches the user's client_id
  RETURN client_id = matching_client_id;
END;
$$;

-- Update the clients table RLS policies
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Admin can do anything with clients
CREATE POLICY "Admins can do anything with clients"
ON public.clients
TO authenticated
USING (public.is_admin(auth.uid()));

-- Clients can only view their own client record
CREATE POLICY "Clients can view own client record"
ON public.clients
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
