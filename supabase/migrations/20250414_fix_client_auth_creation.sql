
-- Function to create a client with auth account - Fixed version with explicit UUID generation
CREATE OR REPLACE FUNCTION public.admin_create_client_with_auth(
  admin_id UUID,
  client_name TEXT,
  client_email TEXT,
  client_password TEXT,
  client_company TEXT DEFAULT NULL,
  client_phone TEXT DEFAULT NULL,
  client_domain TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  new_client_id UUID;
  result JSON;
BEGIN
  -- Check if admin user is actually an admin
  IF NOT public.is_admin(admin_id) THEN
    RAISE EXCEPTION 'Only admin users can create client accounts';
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = client_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;
  
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Create the auth user with confirmed email
  INSERT INTO auth.users (
    id,  -- Explicitly include the id column
    email,
    raw_user_meta_data,
    raw_app_meta_data,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,  -- Use the explicitly generated UUID
    client_email,
    jsonb_build_object('name', client_name, 'role', 'client'),
    jsonb_build_object('role', 'client'),
    crypt(client_password, gen_salt('bf')),
    NOW(), -- Auto-confirm the email
    NOW(),
    NOW()
  );
  
  -- Create the client record linked to the auth user
  INSERT INTO public.clients (
    name,
    email,
    company,
    phone,
    domain,
    user_id
  )
  VALUES (
    client_name,
    client_email,
    client_company,
    client_phone,
    client_domain,
    new_user_id
  )
  RETURNING id INTO new_client_id;
  
  -- Return all created data as JSON
  SELECT jsonb_build_object(
    'user_id', new_user_id,
    'client_id', new_client_id,
    'name', client_name,
    'email', client_email
  ) INTO result;
  
  RETURN result;
END;
$$;
