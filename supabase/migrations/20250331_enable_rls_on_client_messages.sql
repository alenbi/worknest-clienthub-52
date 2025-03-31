
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
