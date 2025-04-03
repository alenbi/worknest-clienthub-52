
-- Function to check if an email exists in auth.users
-- This is a convenience function for admins to check if an email is already registered
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the calling user is an admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin users can check if an email exists';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = email_to_check
  );
END;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.check_email_exists TO authenticated;
