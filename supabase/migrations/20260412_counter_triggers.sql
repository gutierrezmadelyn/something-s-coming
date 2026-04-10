-- Migration: Counter triggers for profiles
-- Date: 2026-04-12
-- Description: Automatically update match_count, swipe_count, and conversations_started

-- ============================================
-- 1. TRIGGER FOR match_count
-- ============================================
-- Increments match_count for both users when a match is created
-- Decrements when a match is deleted

CREATE OR REPLACE FUNCTION update_match_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment for both users
    UPDATE profiles SET match_count = COALESCE(match_count, 0) + 1
    WHERE id = NEW.user_id;

    UPDATE profiles SET match_count = COALESCE(match_count, 0) + 1
    WHERE id = NEW.matched_user_id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement for both users
    UPDATE profiles SET match_count = GREATEST(COALESCE(match_count, 0) - 1, 0)
    WHERE id = OLD.user_id;

    UPDATE profiles SET match_count = GREATEST(COALESCE(match_count, 0) - 1, 0)
    WHERE id = OLD.matched_user_id;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_match_count ON matches;
CREATE TRIGGER trigger_update_match_count
AFTER INSERT OR DELETE ON matches
FOR EACH ROW EXECUTE FUNCTION update_match_count();

-- ============================================
-- 2. TRIGGER FOR swipe_count
-- ============================================
-- Increments swipe_count for the user who swipes

CREATE OR REPLACE FUNCTION update_swipe_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET swipe_count = COALESCE(swipe_count, 0) + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET swipe_count = GREATEST(COALESCE(swipe_count, 0) - 1, 0)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_swipe_count ON swipes;
CREATE TRIGGER trigger_update_swipe_count
AFTER INSERT OR DELETE ON swipes
FOR EACH ROW EXECUTE FUNCTION update_swipe_count();

-- ============================================
-- 3. TRIGGER FOR conversations_started
-- ============================================
-- Increments conversations_started when a conversation is created
-- We need to attribute this to the user who starts it (first message sender)

CREATE OR REPLACE FUNCTION update_conversations_started()
RETURNS TRIGGER AS $$
DECLARE
  v_match matches%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get the match to know who the participants are
    SELECT * INTO v_match FROM matches WHERE id = NEW.match_id;

    IF v_match IS NOT NULL THEN
      -- Increment for the user who created the conversation (user_id in match)
      UPDATE profiles SET conversations_started = COALESCE(conversations_started, 0) + 1
      WHERE id = v_match.user_id;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Get the match to decrement
    SELECT * INTO v_match FROM matches WHERE id = OLD.match_id;

    IF v_match IS NOT NULL THEN
      UPDATE profiles SET conversations_started = GREATEST(COALESCE(conversations_started, 0) - 1, 0)
      WHERE id = v_match.user_id;
    END IF;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_conversations_started ON conversations;
CREATE TRIGGER trigger_update_conversations_started
AFTER INSERT OR DELETE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_conversations_started();

-- ============================================
-- 4. SYNC EXISTING COUNTS
-- ============================================
-- Update counters to reflect actual current state

-- Sync match_count
UPDATE profiles p SET match_count = (
  SELECT COUNT(*) FROM matches
  WHERE user_id = p.id OR matched_user_id = p.id
);

-- Sync swipe_count
UPDATE profiles p SET swipe_count = (
  SELECT COUNT(*) FROM swipes
  WHERE user_id = p.id
);

-- Sync conversations_started (for the match initiator)
UPDATE profiles p SET conversations_started = (
  SELECT COUNT(*) FROM conversations c
  JOIN matches m ON m.id = c.match_id
  WHERE m.user_id = p.id
);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION update_match_count IS 'Trigger function to keep match_count in sync';
COMMENT ON FUNCTION update_swipe_count IS 'Trigger function to keep swipe_count in sync';
COMMENT ON FUNCTION update_conversations_started IS 'Trigger function to keep conversations_started in sync';
