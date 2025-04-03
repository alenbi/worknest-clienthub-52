
-- Function to create a new client user and auto-confirm their email
-- This allows admins to create client accounts that can immediately log in
CREATE OR REPLACE FUNCTION public.create_client_user(
  admin_user_id UUID,
  client_email TEXT,
  client_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if the calling user is an admin
  IF NOT public.is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Only admin users can create client accounts';
  END IF;
  
  -- Create the new user in auth.users
  INSERT INTO auth.users (
    email,
    raw_user_meta_data,
    raw_app_meta_data,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  )
  VALUES (
    client_email,
    '{"role": "client"}'::jsonb,
    '{"role": "client"}'::jsonb,
    auth.crypt(client_password, auth.gen_salt('bf')),
    NOW(), -- Auto-confirm the email
    NOW(),
    NOW()
  )
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.create_client_user TO authenticated;
