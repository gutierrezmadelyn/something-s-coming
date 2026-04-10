-- Migration: Fix database integrity constraints
-- Date: 2026-04-11
-- Description: Add missing constraints to prevent duplicate matches/swipes and self-matching

-- ============================================
-- 1. UNIQUE CONSTRAINT FOR MATCHES (Bidirectional)
-- ============================================
-- Ensures only one match exists between any two users, regardless of who initiated

-- First, clean up any existing duplicate matches (keep the first one)
DELETE FROM matches m1
WHERE EXISTS (
  SELECT 1 FROM matches m2
  WHERE m2.id < m1.id
    AND LEAST(m1.user_id, m1.matched_user_id) = LEAST(m2.user_id, m2.matched_user_id)
    AND GREATEST(m1.user_id, m1.matched_user_id) = GREATEST(m2.user_id, m2.matched_user_id)
);

-- Create a unique index that works bidirectionally
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_unique_pair
ON matches (LEAST(user_id, matched_user_id), GREATEST(user_id, matched_user_id));

-- ============================================
-- 2. CHECK CONSTRAINT FOR NO AUTO-MATCH
-- ============================================
-- Prevents users from matching with themselves

-- First, remove any self-matches that might exist
DELETE FROM matches WHERE user_id = matched_user_id;

-- Add check constraint
ALTER TABLE matches DROP CONSTRAINT IF EXISTS check_no_self_match;
ALTER TABLE matches ADD CONSTRAINT check_no_self_match
CHECK (user_id != matched_user_id);

-- ============================================
-- 3. UNIQUE CONSTRAINT FOR SWIPES
-- ============================================
-- Ensures a user can only swipe once on another user

-- First, clean up any existing duplicate swipes (keep the most recent one)
DELETE FROM swipes s1
WHERE EXISTS (
  SELECT 1 FROM swipes s2
  WHERE s2.created_at > s1.created_at
    AND s1.user_id = s2.user_id
    AND s1.swiped_user_id = s2.swiped_user_id
);

-- Add unique constraint
ALTER TABLE swipes DROP CONSTRAINT IF EXISTS unique_swipe;
ALTER TABLE swipes ADD CONSTRAINT unique_swipe
UNIQUE (user_id, swiped_user_id);

-- ============================================
-- 4. CHECK CONSTRAINT FOR NO SELF-SWIPE
-- ============================================
-- Prevents users from swiping on themselves

-- First, remove any self-swipes
DELETE FROM swipes WHERE user_id = swiped_user_id;

-- Add check constraint
ALTER TABLE swipes DROP CONSTRAINT IF EXISTS check_no_self_swipe;
ALTER TABLE swipes ADD CONSTRAINT check_no_self_swipe
CHECK (user_id != swiped_user_id);

-- ============================================
-- 5. UPDATE check_and_create_match FUNCTION
-- ============================================
-- Add validation for self-match prevention

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
  v_match_exists BOOLEAN;
  v_icebreaker TEXT;
  v_match_id UUID;
BEGIN
  -- Prevent self-match
  IF p_user_id = p_swiped_user_id THEN
    RETURN json_build_object('is_match', false, 'error', 'Cannot match with yourself');
  END IF;

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

  -- Get a random icebreaker
  SELECT question INTO v_icebreaker
  FROM icebreakers
  WHERE is_active = true
  ORDER BY RANDOM()
  LIMIT 1;

  -- Set default icebreaker if none found
  IF v_icebreaker IS NULL THEN
    v_icebreaker := '¿Qué te trajo a esta comunidad?';
  END IF;

  -- Create the match immediately (no mutual swipe required)
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

COMMENT ON FUNCTION check_and_create_match IS
'Creates a match when a user swipes right. No mutual swipe required.
Includes validation to prevent self-matching.';
