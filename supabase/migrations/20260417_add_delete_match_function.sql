-- Migration: Add delete_match_and_swipes RPC function
-- Date: 2026-04-17
-- Description: Creates RPC function to delete a match and all related data (messages, read_receipts, conversations, swipes)

-- ============================================
-- CREATE delete_match_and_swipes FUNCTION
-- ============================================
-- This function deletes a match and all associated data:
-- 1. Messages in the conversation
-- 2. Read receipts for the conversation
-- 3. The conversation itself
-- 4. The match record
-- 5. The swipes between both users

CREATE OR REPLACE FUNCTION delete_match_and_swipes(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_matched_user_id UUID;
BEGIN
  -- Get the user IDs from the match
  SELECT user_id, matched_user_id INTO v_user_id, v_matched_user_id
  FROM matches WHERE id = p_match_id;

  -- Check if match exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Check authorization - only participants can delete the match
  IF auth.uid() NOT IN (v_user_id, v_matched_user_id) THEN
    RAISE EXCEPTION 'Not authorized to delete this match';
  END IF;

  -- Delete messages in conversations related to this match
  DELETE FROM messages WHERE conversation_id IN (
    SELECT id FROM conversations WHERE match_id = p_match_id
  );

  -- Delete read receipts for conversations related to this match
  DELETE FROM read_receipts WHERE conversation_id IN (
    SELECT id FROM conversations WHERE match_id = p_match_id
  );

  -- Delete conversations related to this match
  DELETE FROM conversations WHERE match_id = p_match_id;

  -- Delete the match itself
  DELETE FROM matches WHERE id = p_match_id;

  -- Delete swipes between both users (in both directions)
  DELETE FROM swipes
  WHERE (user_id = v_user_id AND swiped_user_id = v_matched_user_id)
     OR (user_id = v_matched_user_id AND swiped_user_id = v_user_id);
END;
$$;

COMMENT ON FUNCTION delete_match_and_swipes IS 'Deletes a match and all related data: messages, read receipts, conversations, and swipes between both users. Only the participants can delete the match.';
