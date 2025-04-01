
-- Enable Row Level Security on client_messages table
ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow clients to view their own messages
CREATE POLICY "Users can view their own messages" 
ON public.client_messages 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT c.user_id FROM clients c WHERE c.id = client_id
  ) OR 
  auth.uid() IN (
    SELECT u.id FROM auth.users u WHERE u.raw_app_meta_data->>'role' = 'admin'
  )
);

-- Create policy to allow clients to insert their own messages
CREATE POLICY "Users can insert their own messages" 
ON public.client_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT c.user_id FROM clients c WHERE c.id = client_id
  ) OR 
  auth.uid() IN (
    SELECT u.id FROM auth.users u WHERE u.raw_app_meta_data->>'role' = 'admin'
  )
);

-- Create policy to allow clients to update their own messages
CREATE POLICY "Users can update their own messages" 
ON public.client_messages 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT c.user_id FROM clients c WHERE c.id = client_id
  ) OR 
  auth.uid() IN (
    SELECT u.id FROM auth.users u WHERE u.raw_app_meta_data->>'role' = 'admin'
  )
);

-- Create stored procedure to get client requests
CREATE OR REPLACE FUNCTION public.get_client_requests(client_user_id UUID)
RETURNS SETOF requests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT r.*
  FROM requests r
  JOIN clients c ON r.client_id = c.id
  WHERE c.user_id = client_user_id
  ORDER BY r.created_at DESC;
END;
$$;

-- Create stored procedure to create a client request
CREATE OR REPLACE FUNCTION public.create_client_request(
  req_title TEXT,
  req_description TEXT,
  client_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_id UUID;
  new_request_id UUID;
BEGIN
  -- Get client ID from user ID
  SELECT id INTO client_id FROM clients WHERE user_id = client_user_id;
  
  IF client_id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  -- Insert the new request
  INSERT INTO requests (title, description, client_id)
  VALUES (req_title, req_description, client_id)
  RETURNING id INTO new_request_id;
  
  RETURN new_request_id;
END;
$$;

-- Create stored procedure to get all requests with client info
CREATE OR REPLACE FUNCTION public.get_all_requests()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  client_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  client_name TEXT,
  client_email TEXT,
  client_company TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.client_id,
    r.status,
    r.created_at,
    r.updated_at,
    c.name as client_name,
    c.email as client_email,
    c.company as client_company
  FROM requests r
  JOIN clients c ON r.client_id = c.id
  ORDER BY r.created_at DESC;
END;
$$;

-- Create stored procedure to update request status
CREATE OR REPLACE FUNCTION public.update_request_status(
  request_id UUID,
  new_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE requests
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = request_id;
END;
$$;
