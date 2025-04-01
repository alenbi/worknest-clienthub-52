
-- Enable RLS on resources, videos, and offers tables
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Create policies for resources
CREATE POLICY "Enable read access for all users on resources" ON resources
FOR SELECT USING (true);

CREATE POLICY "Enable all access for admins on resources" ON resources
FOR ALL USING (is_admin(auth.uid()));

-- Create policies for videos
CREATE POLICY "Enable read access for all users on videos" ON videos
FOR SELECT USING (true);

CREATE POLICY "Enable all access for admins on videos" ON videos
FOR ALL USING (is_admin(auth.uid()));

-- Create policies for offers
CREATE POLICY "Enable read access for all users on offers" ON offers
FOR SELECT USING (true);

CREATE POLICY "Enable all access for admins on offers" ON offers
FOR ALL USING (is_admin(auth.uid()));

-- Update policies for client_messages to prevent any recursive issues
CREATE OR REPLACE FUNCTION public.is_client_or_admin(client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM clients c 
    WHERE c.id = client_id 
    AND c.user_id = auth.uid()
  ) OR is_admin(auth.uid());
END;
$function$;

-- Ensure the function used by RLS is properly defined
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND raw_app_meta_data->>'role' = 'admin'
  );
END;
$function$;
