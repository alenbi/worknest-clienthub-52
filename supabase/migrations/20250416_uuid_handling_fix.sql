
-- Create a more robust version of the function that handles UUID issues more carefully
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
  -- Very strict validation for admin_id
  IF admin_id IS NULL OR admin_id::TEXT = '' THEN
    RAISE EXCEPTION 'Admin ID cannot be null or empty';
  END IF;
  
  -- Convert to text and back to ensure it's a valid UUID
  BEGIN
    admin_id := admin_id::TEXT::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid UUID format for admin_id: %', admin_id;
  END;
  
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
  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      raw_user_meta_data,
      raw_app_meta_data,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at
    )
    VALUES (
      new_user_id,
      client_email,
      jsonb_build_object('name', client_name, 'role', 'client'),
      jsonb_build_object('role', 'client'),
      crypt(client_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create auth user: %', SQLERRM;
  END;
  
  -- Create the client record linked to the auth user
  BEGIN
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
    
    IF new_client_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create client record: returned ID is null';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create client record: %', SQLERRM;
  END;
  
  -- Return all created data as JSON
  BEGIN
    SELECT json_build_object(
      'user_id', new_user_id,
      'client_id', new_client_id,
      'name', client_name,
      'email', client_email
    ) INTO result;
    
    IF result IS NULL THEN
      RAISE EXCEPTION 'Failed to create result JSON';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to build result JSON: %', SQLERRM;
  END;
  
  RETURN result;
END;
$$;
