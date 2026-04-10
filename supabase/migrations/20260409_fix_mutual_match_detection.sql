-- Migration: Fix mutual match detection
-- Date: 2026-04-09
-- Description: Create RPC function to check mutual swipes and create matches
-- Problem: RLS policy on swipes table prevents users from seeing other users' swipes,
--          which breaks the mutual match detection in the frontend.

-- ============================================
-- FUNCTION: check_and_create_match
-- ============================================
-- This function checks if there's a mutual right swipe between two users
-- and creates a match if both have swiped right on each other.
-- Uses SECURITY DEFINER to bypass RLS restrictions.

CREATE OR REPLACE FUNCTION check_and_create_match(
  p_user_id UUID,
  p_swiped_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mutual_swipe_exists BOOLEAN;
  v_match_exists BOOLEAN;
  v_icebreaker TEXT;
  v_match_id UUID;
  v_result JSON;
BEGIN
  -- Verify the caller is the user making the swipe (security check)
  IF auth.uid() != p_user_id THEN
    RETURN json_build_object('is_match', false, 'error', 'Unauthorized');
  END IF;

  -- Check if a match already exists between these users (in either direction)
  SELECT EXISTS (
    SELECT 1 FROM matches
    WHERE (user_id = p_user_id AND matched_user_id = p_swiped_user_id)
       OR (user_id = p_swiped_user_id AND matched_user_id = p_user_id)
  ) INTO v_match_exists;

  -- If match already exists, return it
  IF v_match_exists THEN
    SELECT id INTO v_match_id FROM matches
    WHERE (user_id = p_user_id AND matched_user_id = p_swiped_user_id)
       OR (user_id = p_swiped_user_id AND matched_user_id = p_user_id)
    LIMIT 1;

    RETURN json_build_object('is_match', true, 'match_id', v_match_id, 'already_existed', true);
  END IF;

  -- Check if the other user has already swiped right on the current user
  SELECT EXISTS (
    SELECT 1 FROM swipes
    WHERE user_id = p_swiped_user_id
      AND swiped_user_id = p_user_id
      AND direction = 'right'
  ) INTO v_mutual_swipe_exists;

  -- If no mutual swipe, no match
  IF NOT v_mutual_swipe_exists THEN
    RETURN json_build_object('is_match', false);
  END IF;

  -- Mutual swipe exists! Get a random icebreaker
  SELECT question INTO v_icebreaker
  FROM icebreakers
  WHERE is_active = true
  ORDER BY RANDOM()
  LIMIT 1;

  -- Set default icebreaker if none found
  IF v_icebreaker IS NULL THEN
    v_icebreaker := '¿Qué te trajo a esta comunidad?';
  END IF;

  -- Create the match
  INSERT INTO matches (user_id, matched_user_id, match_type, icebreaker)
  VALUES (p_user_id, p_swiped_user_id, 'organic', v_icebreaker)
  RETURNING id INTO v_match_id;

  -- Return success with match details
  RETURN json_build_object(
    'is_match', true,
    'match_id', v_match_id,
    'icebreaker', v_icebreaker,
    'already_existed', false
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Match was created by the other user at the same time (race condition)
    SELECT id INTO v_match_id FROM matches
    WHERE (user_id = p_user_id AND matched_user_id = p_swiped_user_id)
       OR (user_id = p_swiped_user_id AND matched_user_id = p_user_id)
    LIMIT 1;

    RETURN json_build_object('is_match', true, 'match_id', v_match_id, 'already_existed', true);
  WHEN OTHERS THEN
    RETURN json_build_object('is_match', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_and_create_match(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION check_and_create_match IS
'Checks if there is a mutual right swipe between two users and creates a match if so.
Uses SECURITY DEFINER to bypass RLS restrictions on the swipes table while maintaining
privacy (users cannot see if someone swiped on them until they also swipe).';
