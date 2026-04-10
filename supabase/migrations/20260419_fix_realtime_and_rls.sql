-- Migration: Fix Realtime and RLS for messaging
-- Date: 2026-04-19
-- Description:
-- 1. Fix read_receipts RLS to allow conversation participants to see each other's read status
-- 2. Enable realtime for messages and read_receipts tables
-- 3. Add the optimized get_chat_list function

-- ============================================
-- 1. FIX read_receipts RLS POLICIES
-- ============================================
-- Users need to see the OTHER user's read receipt to show double check marks

-- Drop existing restrictive policies
DROP POLICY IF EXISTS read_receipts_select_own ON read_receipts;
DROP POLICY IF EXISTS read_receipts_insert_own ON read_receipts;
DROP POLICY IF EXISTS read_receipts_update_own ON read_receipts;
DROP POLICY IF EXISTS read_receipts_delete_own ON read_receipts;

-- Create new policy: Users can see read receipts for conversations they're part of
CREATE POLICY read_receipts_select_participant ON read_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = read_receipts.conversation_id
        AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
    )
  );

-- Users can only insert/update their own read receipts
CREATE POLICY read_receipts_insert_own ON read_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY read_receipts_update_own ON read_receipts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY read_receipts_delete_own ON read_receipts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 2. ENABLE REALTIME FOR TABLES
-- ============================================
-- This ensures realtime subscriptions work

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for read_receipts
ALTER PUBLICATION supabase_realtime ADD TABLE read_receipts;

-- Enable realtime for matches (for new match notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- ============================================
-- 3. CREATE get_chat_list FUNCTION (if not exists)
-- ============================================

CREATE OR REPLACE FUNCTION get_chat_list(p_user_id UUID)
RETURNS TABLE (
  match_id UUID,
  match_type TEXT,
  icebreaker TEXT,
  match_created_at TIMESTAMPTZ,
  has_conversation BOOLEAN,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_role TEXT,
  other_user_city TEXT,
  other_user_avatar_initials TEXT,
  other_user_avatar_color TEXT,
  other_user_photo_url TEXT,
  other_user_linkedin TEXT,
  other_user_whatsapp TEXT,
  other_user_show_location BOOLEAN,
  other_user_show_phone BOOLEAN,
  conversation_id UUID,
  last_message_at TIMESTAMPTZ,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_created_at TIMESTAMPTZ,
  unread_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH user_matches AS (
    SELECT
      m.id AS match_id,
      m.match_type,
      m.icebreaker,
      m.created_at AS match_created_at,
      m.has_conversation,
      CASE
        WHEN m.user_id = p_user_id THEN m.matched_user_id
        ELSE m.user_id
      END AS other_user_id
    FROM matches m
    WHERE m.user_id = p_user_id OR m.matched_user_id = p_user_id
  ),
  conversations_with_last_msg AS (
    SELECT
      c.id AS conv_id,
      c.match_id,
      c.last_message_at,
      lm.id AS last_msg_id,
      lm.content AS last_msg_content,
      lm.sender_id AS last_msg_sender,
      lm.created_at AS last_msg_created
    FROM conversations c
    LEFT JOIN LATERAL (
      SELECT msg.id, msg.content, msg.sender_id, msg.created_at
      FROM messages msg
      WHERE msg.conversation_id = c.id
      ORDER BY msg.created_at DESC
      LIMIT 1
    ) lm ON TRUE
    WHERE c.match_id IN (SELECT um.match_id FROM user_matches um)
  ),
  unread_counts AS (
    SELECT
      c.id AS conv_id,
      COALESCE(
        (
          SELECT COUNT(*)::INTEGER
          FROM messages msg
          WHERE msg.conversation_id = c.id
            AND msg.sender_id != p_user_id
            AND (
              NOT EXISTS (
                SELECT 1 FROM read_receipts rr
                WHERE rr.conversation_id = c.id AND rr.user_id = p_user_id
              )
              OR msg.created_at > (
                SELECT rr.last_read_at FROM read_receipts rr
                WHERE rr.conversation_id = c.id AND rr.user_id = p_user_id
              )
            )
        ),
        0
      ) AS unread_cnt
    FROM conversations c
    WHERE c.match_id IN (SELECT um.match_id FROM user_matches um)
  )
  SELECT
    um.match_id,
    um.match_type,
    um.icebreaker,
    um.match_created_at,
    um.has_conversation,
    p.id AS other_user_id,
    p.name AS other_user_name,
    p.role AS other_user_role,
    p.city AS other_user_city,
    p.avatar_initials AS other_user_avatar_initials,
    p.avatar_color AS other_user_avatar_color,
    p.photo_url AS other_user_photo_url,
    p.linkedin AS other_user_linkedin,
    p.whatsapp AS other_user_whatsapp,
    p.show_location AS other_user_show_location,
    p.show_phone AS other_user_show_phone,
    cwlm.conv_id AS conversation_id,
    cwlm.last_message_at,
    cwlm.last_msg_id AS last_message_id,
    cwlm.last_msg_content AS last_message_content,
    cwlm.last_msg_sender AS last_message_sender_id,
    cwlm.last_msg_created AS last_message_created_at,
    COALESCE(uc.unread_cnt, 0) AS unread_count
  FROM user_matches um
  JOIN profiles p ON p.id = um.other_user_id
  LEFT JOIN conversations_with_last_msg cwlm ON cwlm.match_id = um.match_id
  LEFT JOIN unread_counts uc ON uc.conv_id = cwlm.conv_id
  ORDER BY
    COALESCE(uc.unread_cnt, 0) DESC,
    COALESCE(cwlm.last_msg_created, cwlm.last_message_at, um.match_created_at) DESC;
END;
$$;

-- ============================================
-- 4. CREATE get_messages_paginated FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_messages_paginated(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 30,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_before_created_at TIMESTAMPTZ;
BEGIN
  IF p_before_id IS NOT NULL THEN
    SELECT m.created_at INTO v_before_created_at
    FROM messages m
    WHERE m.id = p_before_id;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.created_at
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND (
      p_before_id IS NULL
      OR m.created_at < v_before_created_at
      OR (m.created_at = v_before_created_at AND m.id < p_before_id)
    )
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- 5. ADD PERFORMANCE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender_created
ON messages(conversation_id, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_read_receipts_conv_user
ON read_receipts(conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_matches_users
ON matches(user_id, matched_user_id);

CREATE INDEX IF NOT EXISTS idx_matches_matched_users
ON matches(matched_user_id, user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_match
ON conversations(match_id);
