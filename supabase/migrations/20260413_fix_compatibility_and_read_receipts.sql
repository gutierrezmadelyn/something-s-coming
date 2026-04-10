-- Migration: Fix calculate_compatibility and create read_receipts table
-- Date: 2026-04-13
-- Description: Fix wants_to_learn array comparison and add read receipts for messages

-- ============================================
-- 1. FIX calculate_compatibility FUNCTION
-- ============================================
-- The original function used = operator with arrays which doesn't work
-- Now uses && (overlap) operator for proper array comparison

CREATE OR REPLACE FUNCTION public.calculate_compatibility(user_a uuid, user_b uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_a profiles%ROWTYPE;
  profile_b profiles%ROWTYPE;
  score integer := 0;
  overlap_count integer;
BEGIN
  SELECT * INTO profile_a FROM profiles WHERE id = user_a;
  SELECT * INTO profile_b FROM profiles WHERE id = user_b;

  IF profile_a IS NULL OR profile_b IS NULL THEN RETURN 0; END IF;

  -- A's offers match B's seeks: +10 per match
  SELECT COUNT(*) INTO overlap_count
  FROM unnest(COALESCE(profile_a.offers, '{}')) AS a_offer
  WHERE a_offer = ANY(COALESCE(profile_b.seeks, '{}'));
  score := score + (overlap_count * 10);

  -- A's seeks match B's offers: +10 per match
  SELECT COUNT(*) INTO overlap_count
  FROM unnest(COALESCE(profile_a.seeks, '{}')) AS a_seek
  WHERE a_seek = ANY(COALESCE(profile_b.offers, '{}'));
  score := score + (overlap_count * 10);

  -- Different expertise items (complementary skills): +10 per item
  SELECT COUNT(*) INTO overlap_count
  FROM unnest(COALESCE(profile_a.expertise, '{}')) AS a_exp
  WHERE NOT (a_exp = ANY(COALESCE(profile_b.expertise, '{}')));
  score := score + (overlap_count * 10);

  -- Sector overlap: +7 per match
  SELECT COUNT(*) INTO overlap_count
  FROM unnest(COALESCE(profile_a.sectors, '{}')) AS a_sec
  WHERE a_sec = ANY(COALESCE(profile_b.sectors, '{}'));
  score := score + (overlap_count * 7);

  -- FIX: A wants to learn what B knows: +15 (using array overlap)
  -- wants_to_learn is text[] so we use && for array overlap
  IF COALESCE(profile_a.wants_to_learn, '{}') && COALESCE(profile_b.expertise, '{}') THEN
    score := score + 15;
  END IF;

  -- FIX: B wants to learn what A knows: +10 (using array overlap)
  IF COALESCE(profile_b.wants_to_learn, '{}') && COALESCE(profile_a.expertise, '{}') THEN
    score := score + 10;
  END IF;

  RETURN LEAST(score, 100);
END;
$$;

COMMENT ON FUNCTION calculate_compatibility IS
'Calculates compatibility score between two users (0-100).
Considers: offers/seeks matches, complementary expertise, sector overlap, and learning desires.';

-- ============================================
-- 2. CREATE read_receipts TABLE
-- ============================================
-- Tracks the last message read by each user in each conversation

CREATE TABLE IF NOT EXISTS read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_read_message_id UUID,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Add foreign key constraints (optional - using soft references for flexibility)
-- Note: We're not using strict FK because the plan mentioned FK were removed for flexibility

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_read_receipts_conversation ON read_receipts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_last_read ON read_receipts(last_read_at DESC);

-- ============================================
-- 3. ENABLE RLS FOR read_receipts
-- ============================================
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own read receipts
DROP POLICY IF EXISTS read_receipts_select_own ON read_receipts;
CREATE POLICY read_receipts_select_own ON read_receipts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS read_receipts_insert_own ON read_receipts;
CREATE POLICY read_receipts_insert_own ON read_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS read_receipts_update_own ON read_receipts;
CREATE POLICY read_receipts_update_own ON read_receipts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS read_receipts_delete_own ON read_receipts;
CREATE POLICY read_receipts_delete_own ON read_receipts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. HELPER FUNCTION: mark_messages_as_read
-- ============================================
-- Marks all messages in a conversation as read for a user

CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_last_message_id UUID;
BEGIN
  -- Use provided user_id or get from auth context
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Get the last message in the conversation
  SELECT id INTO v_last_message_id
  FROM messages
  WHERE conversation_id = p_conversation_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Upsert read receipt
  INSERT INTO read_receipts (conversation_id, user_id, last_read_message_id, last_read_at)
  VALUES (p_conversation_id, v_user_id, v_last_message_id, NOW())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    last_read_message_id = EXCLUDED.last_read_message_id,
    last_read_at = NOW(),
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION mark_messages_as_read IS 'Marks all messages in a conversation as read for the current user';

-- ============================================
-- 5. HELPER FUNCTION: get_unread_count
-- ============================================
-- Gets the count of unread messages for a user in a conversation

CREATE OR REPLACE FUNCTION get_unread_count(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_last_read_at TIMESTAMPTZ;
  v_unread_count INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Get last read timestamp
  SELECT last_read_at INTO v_last_read_at
  FROM read_receipts
  WHERE conversation_id = p_conversation_id AND user_id = v_user_id;

  -- Count messages after last read (or all messages if never read)
  -- Exclude messages sent by the user themselves
  SELECT COUNT(*) INTO v_unread_count
  FROM messages
  WHERE conversation_id = p_conversation_id
    AND sender_id != v_user_id
    AND (v_last_read_at IS NULL OR created_at > v_last_read_at);

  RETURN v_unread_count;
END;
$$;

COMMENT ON FUNCTION get_unread_count IS 'Returns the number of unread messages for a user in a conversation';

-- ============================================
-- 6. HELPER FUNCTION: get_total_unread_count
-- ============================================
-- Gets total unread messages across all conversations for a user

CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_total_unread INTEGER := 0;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Get all conversations the user is part of (through matches)
  SELECT COALESCE(SUM(
    CASE
      WHEN rr.last_read_at IS NULL THEN
        (SELECT COUNT(*) FROM messages m
         WHERE m.conversation_id = c.id
         AND m.sender_id != v_user_id)
      ELSE
        (SELECT COUNT(*) FROM messages m
         WHERE m.conversation_id = c.id
         AND m.sender_id != v_user_id
         AND m.created_at > rr.last_read_at)
    END
  ), 0)::INTEGER INTO v_total_unread
  FROM conversations c
  JOIN matches mt ON mt.id = c.match_id
  LEFT JOIN read_receipts rr ON rr.conversation_id = c.id AND rr.user_id = v_user_id
  WHERE mt.user_id = v_user_id OR mt.matched_user_id = v_user_id;

  RETURN v_total_unread;
END;
$$;

COMMENT ON FUNCTION get_total_unread_count IS 'Returns total unread messages across all conversations for a user';
