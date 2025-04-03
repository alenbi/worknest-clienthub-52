
-- First, ensure RLS is enabled on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policy that allows clients to view their own record
CREATE POLICY IF NOT EXISTS "Clients can view own client record"
ON public.clients
FOR SELECT
USING (user_id = auth.uid());

-- Create a security definer function to check if client exists by email
CREATE OR REPLACE FUNCTION public.get_client_by_email(email_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  user_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.email, c.user_id
  FROM public.clients c
  WHERE LOWER(c.email) = LOWER(email_param);
END;
$$;

-- Function to link auth user to client record
CREATE OR REPLACE FUNCTION public.ensure_client_user_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If a user signs up with an email that matches a client record
  -- and that client record doesn't have a user_id, link them
  UPDATE public.clients
  SET user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email)
    AND (user_id IS NULL OR user_id = '');
    
  RETURN NEW;
END;
$$;

-- Trigger to auto-link clients when users are created
DROP TRIGGER IF EXISTS on_auth_user_created_link_client ON auth.users;

CREATE TRIGGER on_auth_user_created_link_client
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.ensure_client_user_link();
