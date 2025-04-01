
-- Add role field to auth.users metadata if not exists and ensure the admin is properly marked
CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS void AS $$
BEGIN
  -- Ensure the admin user has the correct role in metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN raw_app_meta_data IS NULL THEN '{"role": "client"}'::jsonb
      WHEN raw_app_meta_data->>'role' IS NULL THEN raw_app_meta_data || '{"role": "client"}'::jsonb
      ELSE raw_app_meta_data
    END
  WHERE raw_app_meta_data->>'role' IS NULL OR raw_app_meta_data IS NULL;
  
  -- Set the admin role for the specific admin email
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
  WHERE email = 'support@digitalshopi.in';
  
  -- Ensure all other users are clients
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || '{"role": "client"}'::jsonb
  WHERE email != 'support@digitalshopi.in' 
    AND (raw_app_meta_data->>'role' IS NULL OR raw_app_meta_data->>'role' != 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to ensure roles are set
SELECT ensure_admin_role();

-- Create a better is_admin function that strictly checks for admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND (raw_app_meta_data->>'role' = 'admin' OR email = 'support@digitalshopi.in')
  );
END;
$$;

-- Create a function to check if a user is a client
CREATE OR REPLACE FUNCTION public.is_client(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email != 'support@digitalshopi.in'
    AND (raw_app_meta_data->>'role' = 'client' OR raw_app_meta_data->>'role' IS NULL)
  );
END;
$$;
