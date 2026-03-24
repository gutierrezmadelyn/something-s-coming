-- Migration: Create admin function for importing users
-- Date: 2026-03-25
-- This function bypasses RLS to allow admins to import users

-- Function to import a single user (called from frontend)
CREATE OR REPLACE FUNCTION admin_import_user(
  p_email TEXT,
  p_name TEXT,
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
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_id UUID;
  v_is_admin BOOLEAN;
  v_initials TEXT;
  v_name_parts TEXT[];
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Normalize email to lowercase
  p_email := LOWER(TRIM(p_email));

  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email is required');
  END IF;

  -- Check if user already exists (case-insensitive)
  SELECT id INTO v_existing_id
  FROM profiles
  WHERE LOWER(email) = p_email;

  -- Generate initials
  v_name_parts := string_to_array(TRIM(p_name), ' ');
  IF array_length(v_name_parts, 1) >= 2 THEN
    v_initials := UPPER(LEFT(v_name_parts[1], 1) || LEFT(v_name_parts[array_length(v_name_parts, 1)], 1));
  ELSE
    v_initials := UPPER(LEFT(COALESCE(v_name_parts[1], '??'), 2));
  END IF;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing user
    UPDATE profiles SET
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
    WHERE id = v_existing_id;

    RETURN json_build_object('success', true, 'id', v_existing_id, 'action', 'updated');
  ELSE
    -- Insert new user
    v_user_id := gen_random_uuid();

    INSERT INTO profiles (
      id, name, email, country, city, role, work_type, expertise,
      whatsapp, linkedin, avatar_initials, avatar_color,
      has_logged_in, xp, streak, league, swipe_count, match_count, conversations_started
    ) VALUES (
      v_user_id, p_name, p_email, p_country, p_city, p_role, p_work_type, p_expertise,
      p_whatsapp, p_linkedin, v_initials, '#2851A3',
      false, 0, 0, 'none', 0, 0, 0
    );

    RETURN json_build_object('success', true, 'id', v_user_id, 'action', 'created');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION admin_import_user TO authenticated;

-- Function to add user to cohort
CREATE OR REPLACE FUNCTION admin_add_to_cohort(
  p_profile_id UUID,
  p_cohort_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  INSERT INTO cohort_members (cohort_id, profile_id)
  VALUES (p_cohort_id, p_profile_id)
  ON CONFLICT (cohort_id, profile_id) DO NOTHING;

  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_add_to_cohort TO authenticated;
