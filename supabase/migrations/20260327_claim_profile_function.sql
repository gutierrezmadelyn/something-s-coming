-- Migration: Create function to claim imported profile
-- When a user signs up, check if there's an existing profile with their email
-- If found, update the profile ID to match the auth user ID

CREATE OR REPLACE FUNCTION claim_profile_by_email(
  p_auth_id UUID,
  p_email TEXT,
  p_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_profile profiles%ROWTYPE;
BEGIN
  -- Normalize email
  p_email := LOWER(TRIM(p_email));

  -- Check if profile with this auth_id already exists
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_auth_id;

  IF v_profile.id IS NOT NULL THEN
    -- Profile already exists with correct ID
    RETURN json_build_object('success', true, 'action', 'existing', 'profile_id', v_profile.id);
  END IF;

  -- Check if there's an imported profile with this email (different ID)
  SELECT id INTO v_existing_id
  FROM profiles
  WHERE LOWER(email) = p_email AND id != p_auth_id;

  IF v_existing_id IS NOT NULL THEN
    -- Found imported profile - need to "claim" it
    -- First, update all references to this profile

    -- Update cohort_members
    UPDATE cohort_members SET profile_id = p_auth_id WHERE profile_id = v_existing_id;

    -- Update matches (both user_id and matched_user_id)
    UPDATE matches SET user_id = p_auth_id WHERE user_id = v_existing_id;
    UPDATE matches SET matched_user_id = p_auth_id WHERE matched_user_id = v_existing_id;

    -- Update swipes
    UPDATE swipes SET user_id = p_auth_id WHERE user_id = v_existing_id;
    UPDATE swipes SET swiped_user_id = p_auth_id WHERE swiped_user_id = v_existing_id;

    -- Update messages
    UPDATE messages SET sender_id = p_auth_id WHERE sender_id = v_existing_id;

    -- Update xp_log
    UPDATE xp_log SET user_id = p_auth_id WHERE user_id = v_existing_id;

    -- Now update the profile ID itself
    UPDATE profiles
    SET id = p_auth_id, updated_at = NOW()
    WHERE id = v_existing_id;

    RETURN json_build_object('success', true, 'action', 'claimed', 'old_id', v_existing_id, 'new_id', p_auth_id);
  ELSE
    -- No existing profile - create new one
    INSERT INTO profiles (
      id, email, name, avatar_initials, avatar_color,
      has_logged_in, xp, streak, league, swipe_count, match_count, conversations_started
    ) VALUES (
      p_auth_id,
      p_email,
      COALESCE(p_name, ''),
      UPPER(LEFT(COALESCE(p_name, 'NN'), 2)),
      '#2851A3',
      false, 0, 0, 'none', 0, 0, 0
    );

    RETURN json_build_object('success', true, 'action', 'created', 'profile_id', p_auth_id);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION claim_profile_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION claim_profile_by_email TO anon;
