-- Migration: Create function to create auth users with standard password
-- This allows admins to import users who can login immediately

CREATE OR REPLACE FUNCTION admin_create_auth_user(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Normalize email
  p_email := LOWER(TRIM(p_email));

  -- Check if auth user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = p_email;

  IF v_user_id IS NOT NULL THEN
    RETURN json_build_object('success', true, 'action', 'exists', 'user_id', v_user_id);
  END IF;

  -- Generate new user ID
  v_user_id := gen_random_uuid();

  -- Encrypt password using Supabase's method
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_pw,
    NOW(), -- Email confirmed immediately
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('full_name', COALESCE(p_name, '')),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Create identity for email provider
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    p_email,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RETURN json_build_object('success', true, 'action', 'created', 'user_id', v_user_id);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_auth_user TO authenticated;
