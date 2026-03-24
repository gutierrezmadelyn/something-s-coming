-- Update admin_import_user to create both auth user and profile

CREATE OR REPLACE FUNCTION admin_import_user(
  p_email TEXT,
  p_name TEXT,
  p_password TEXT DEFAULT 'Negoworking2026!',
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_work_type TEXT DEFAULT NULL,
  p_expertise TEXT[] DEFAULT NULL,
  p_whatsapp TEXT DEFAULT NULL,
  p_linkedin TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_existing_auth_id UUID;
  v_existing_profile_id UUID;
  v_is_admin BOOLEAN;
  v_initials TEXT;
  v_name_parts TEXT[];
  v_encrypted_pw TEXT;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Normalize email to lowercase
  p_email := LOWER(TRIM(p_email));

  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email is required');
  END IF;

  -- Generate initials
  v_name_parts := string_to_array(TRIM(p_name), ' ');
  IF array_length(v_name_parts, 1) >= 2 THEN
    v_initials := UPPER(LEFT(v_name_parts[1], 1) || LEFT(v_name_parts[array_length(v_name_parts, 1)], 1));
  ELSE
    v_initials := UPPER(LEFT(COALESCE(v_name_parts[1], '??'), 2));
  END IF;

  -- Check if auth user already exists
  SELECT id INTO v_existing_auth_id
  FROM auth.users
  WHERE LOWER(email) = p_email;

  IF v_existing_auth_id IS NOT NULL THEN
    -- Auth user exists, check if profile exists
    SELECT id INTO v_existing_profile_id
    FROM public.profiles
    WHERE id = v_existing_auth_id;

    IF v_existing_profile_id IS NOT NULL THEN
      -- Update existing profile
      UPDATE public.profiles SET
        name = COALESCE(NULLIF(p_name, ''), name),
        country = COALESCE(NULLIF(p_country, ''), country),
        city = COALESCE(NULLIF(p_city, ''), city),
        role = COALESCE(NULLIF(p_role, ''), role),
        work_type = COALESCE(NULLIF(p_work_type, ''), work_type),
        expertise = COALESCE(p_expertise, expertise),
        whatsapp = COALESCE(NULLIF(p_whatsapp, ''), whatsapp),
        linkedin = COALESCE(NULLIF(p_linkedin, ''), linkedin),
        avatar_initials = v_initials,
        updated_at = NOW()
      WHERE id = v_existing_auth_id;

      RETURN json_build_object('success', true, 'id', v_existing_auth_id, 'action', 'updated');
    ELSE
      -- Auth exists but no profile - create profile
      v_user_id := v_existing_auth_id;
    END IF;
  ELSE
    -- Create new auth user
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', p_email, v_encrypted_pw,
      NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', COALESCE(p_name, '')),
      NOW(), NOW(), '', '', '', ''
    );

    -- Create identity
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id, v_user_id, p_email,
      jsonb_build_object('sub', v_user_id::text, 'email', p_email),
      'email', NOW(), NOW(), NOW()
    );
  END IF;

  -- Create or update profile
  INSERT INTO public.profiles (
    id, name, email, country, city, role, work_type, expertise,
    whatsapp, linkedin, avatar_initials, avatar_color,
    has_logged_in, xp, streak, league, swipe_count, match_count, conversations_started
  ) VALUES (
    v_user_id, p_name, p_email, p_country, p_city, p_role, p_work_type, p_expertise,
    p_whatsapp, p_linkedin, v_initials, '#2851A3',
    false, 0, 0, 'none', 0, 0, 0
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
    country = COALESCE(NULLIF(EXCLUDED.country, ''), profiles.country),
    city = COALESCE(NULLIF(EXCLUDED.city, ''), profiles.city),
    role = COALESCE(NULLIF(EXCLUDED.role, ''), profiles.role),
    work_type = COALESCE(NULLIF(EXCLUDED.work_type, ''), profiles.work_type),
    expertise = COALESCE(EXCLUDED.expertise, profiles.expertise),
    whatsapp = COALESCE(NULLIF(EXCLUDED.whatsapp, ''), profiles.whatsapp),
    linkedin = COALESCE(NULLIF(EXCLUDED.linkedin, ''), profiles.linkedin),
    avatar_initials = EXCLUDED.avatar_initials,
    updated_at = NOW();

  RETURN json_build_object('success', true, 'id', v_user_id, 'action', CASE WHEN v_existing_auth_id IS NOT NULL THEN 'updated' ELSE 'created' END);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
