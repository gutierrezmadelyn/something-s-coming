-- Server-side reporting dataset for the admin dashboard.
--
-- The dashboard needs platform-wide interaction data (every match, conversation,
-- message and swipe) to compute totals per cohort. Reading those tables directly
-- from the client is bounded by row-level security, so an administrator only ever
-- sees their OWN rows — which is why message totals collapsed to ~1.
--
-- This function runs as SECURITY DEFINER (bypassing RLS) but first verifies the
-- caller is an administrator, and it deliberately returns only interaction
-- METADATA: it never exposes message bodies (messages.content is not selected).
-- That gives admins the true platform totals without reading private chats.

CREATE OR REPLACE FUNCTION public.get_admin_reporting_dataset()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT jsonb_build_object(
    'matches', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'user_id', user_id, 'matched_user_id', matched_user_id,
      'match_type', match_type, 'has_conversation', has_conversation, 'created_at', created_at
    )) FROM matches), '[]'::jsonb),
    'conversations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'match_id', match_id, 'started_at', started_at, 'last_message_at', last_message_at
    )) FROM conversations), '[]'::jsonb),
    -- Metadata only: no message content is ever returned.
    'messages', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'conversation_id', conversation_id, 'sender_id', sender_id,
      'message_type', message_type, 'created_at', created_at
    )) FROM messages), '[]'::jsonb),
    'swipes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'user_id', user_id, 'swiped_user_id', swiped_user_id, 'direction', direction, 'created_at', created_at
    )) FROM swipes), '[]'::jsonb),
    'members', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'cohort_id', cohort_id, 'profile_id', profile_id
    )) FROM cohort_members), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_reporting_dataset() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_reporting_dataset() TO authenticated;

COMMENT ON FUNCTION public.get_admin_reporting_dataset IS 'Admin-only platform-wide interaction metadata for reporting; excludes message bodies.';
