-- Migration: Optimized Chat List Query
-- Date: 2026-04-18
-- Description: Creates an optimized RPC function that returns all chat list data in ONE query
-- instead of N+1 queries (eliminates separate queries per conversation for unread count and last message)

-- ============================================
-- 1. CREATE get_chat_list FUNCTION
-- ============================================
-- Returns all matches with:
-- - Matched user profile
-- - Conversation info
-- - Last message (content, sender, timestamp)
-- - Unread count
-- All in a SINGLE query using efficient JOINs and subqueries

CREATE OR REPLACE FUNCTION get_chat_list(p_user_id UUID)
RETURNS TABLE (
  match_id UUID,
  match_type TEXT,
  icebreaker TEXT,
  match_created_at TIMESTAMPTZ,
  has_conversation BOOLEAN,
  -- Other user info
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
  -- Conversation info
  conversation_id UUID,
  last_message_at TIMESTAMPTZ,
  -- Last message
  last_message_id UUID,
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_created_at TIMESTAMPTZ,
  -- Unread count
  unread_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH user_matches AS (
    -- Get all matches for this user
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
    -- Get conversations with last message using LATERAL join for efficiency
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
    WHERE c.match_id IN (SELECT match_id FROM user_matches)
  ),
  unread_counts AS (
    -- Calculate unread counts efficiently
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
    WHERE c.match_id IN (SELECT match_id FROM user_matches)
  )
  SELECT
    um.match_id,
    um.match_type,
    um.icebreaker,
    um.match_created_at,
    um.has_conversation,
    -- Other user profile
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
    -- Conversation
    cwlm.conv_id AS conversation_id,
    cwlm.last_message_at,
    -- Last message
    cwlm.last_msg_id AS last_message_id,
    cwlm.last_msg_content AS last_message_content,
    cwlm.last_msg_sender AS last_message_sender_id,
    cwlm.last_msg_created AS last_message_created_at,
    -- Unread
    COALESCE(uc.unread_cnt, 0) AS unread_count
  FROM user_matches um
  JOIN profiles p ON p.id = um.other_user_id
  LEFT JOIN conversations_with_last_msg cwlm ON cwlm.match_id = um.match_id
  LEFT JOIN unread_counts uc ON uc.conv_id = cwlm.conv_id
  ORDER BY
    -- Unread first
    COALESCE(uc.unread_cnt, 0) DESC,
    -- Then by last activity
    COALESCE(cwlm.last_msg_created, cwlm.last_message_at, um.match_created_at) DESC;
END;
$$;

COMMENT ON FUNCTION get_chat_list IS 'Returns optimized chat list data in a single query. Includes matches, profiles, conversations, last messages, and unread counts.';

-- ============================================
-- 2. CREATE get_messages_paginated FUNCTION
-- ============================================
-- Returns messages with pagination for efficient loading

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
  -- Get the created_at of the before_id message if provided
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

COMMENT ON FUNCTION get_messages_paginated IS 'Returns paginated messages for a conversation. Use p_before_id for cursor-based pagination.';

-- ============================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index for faster message lookups by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC);

-- Index for faster unread count calculation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender_created
ON messages(conversation_id, sender_id, created_at DESC);

-- Index for read receipts lookup
CREATE INDEX IF NOT EXISTS idx_read_receipts_conv_user
ON read_receipts(conversation_id, user_id);

-- Index for matches lookup
CREATE INDEX IF NOT EXISTS idx_matches_users
ON matches(user_id, matched_user_id);

CREATE INDEX IF NOT EXISTS idx_matches_matched_users
ON matches(matched_user_id, user_id);
