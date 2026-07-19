-- Administrative reporting foundation.
-- Uses interaction metadata only; message.content is deliberately excluded.

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS event_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Guatemala';

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_name text NOT NULL CHECK (event_name IN (
    'session_started', 'profile_viewed', 'search_used', 'filter_used',
    'conversation_opened', 'whatsapp_clicked', 'linkedin_clicked',
    'notification_opened'
  )),
  cohort_id uuid,
  subject_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_user_time_idx ON public.analytics_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_cohort_time_idx ON public.analytics_events(cohort_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_name_time_idx ON public.analytics_events(event_name, occurred_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_events_insert_own ON public.analytics_events;
CREATE POLICY analytics_events_insert_own ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS analytics_events_select_admin ON public.analytics_events;
CREATE POLICY analytics_events_select_admin ON public.analytics_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
  ));

CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_event_name text,
  p_cohort_id uuid DEFAULT NULL,
  p_subject_id uuid DEFAULT NULL,
  p_properties jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO analytics_events(user_id, event_name, cohort_id, subject_id, properties)
  VALUES (auth.uid(), p_event_name, p_cohort_id, p_subject_id, COALESCE(p_properties, '{}'::jsonb));
  UPDATE profiles SET last_active = now() WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.track_analytics_event(text,uuid,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_analytics_event(text,uuid,uuid,jsonb) TO authenticated;

-- A stable, server-side summary for the executive dashboard. It intentionally
-- returns counts and metadata, never private message bodies.
CREATE OR REPLACE FUNCTION public.get_admin_reporting_summary(
  p_cohort_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
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

  WITH members AS (
    SELECT p.* FROM profiles p
    WHERE p.is_admin = false
      AND (p_cohort_id IS NULL OR EXISTS (
        SELECT 1 FROM cohort_members cm WHERE cm.cohort_id = p_cohort_id AND cm.profile_id = p.id
      ))
  ), cohort_matches AS (
    SELECT mt.* FROM matches mt
    JOIN members a ON a.id = mt.user_id
    JOIN members b ON b.id = mt.matched_user_id
    WHERE (p_from IS NULL OR mt.created_at >= p_from) AND (p_to IS NULL OR mt.created_at <= p_to)
  ), cohort_conversations AS (
    SELECT c.* FROM conversations c JOIN cohort_matches mt ON mt.id = c.match_id
  ), cohort_messages AS (
    SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.created_at
    FROM messages m JOIN cohort_conversations c ON c.id = m.conversation_id
    WHERE (p_from IS NULL OR m.created_at >= p_from) AND (p_to IS NULL OR m.created_at <= p_to)
  ), conversation_quality AS (
    SELECT c.id,
      count(m.id) AS message_count,
      count(DISTINCT m.sender_id) AS sender_count
    FROM cohort_conversations c LEFT JOIN cohort_messages m ON m.conversation_id = c.id
    GROUP BY c.id
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'participants', (SELECT count(*) FROM members),
    'activated', (SELECT count(*) FROM members WHERE has_logged_in = true),
    'complete_profiles', (SELECT count(*) FROM members WHERE pitch IS NOT NULL AND cardinality(expertise) > 0 AND cardinality(offers) > 0 AND cardinality(seeks) > 0),
    'matches', (SELECT count(*) FROM cohort_matches),
    'organic_matches', (SELECT count(*) FROM cohort_matches WHERE COALESCE(match_type,'organic') = 'organic'),
    'assisted_matches', (SELECT count(*) FROM cohort_matches WHERE match_type IS DISTINCT FROM 'organic'),
    'conversations', (SELECT count(*) FROM cohort_conversations),
    'conversations_with_messages', (SELECT count(*) FROM conversation_quality WHERE message_count > 0),
    'reciprocal_conversations', (SELECT count(*) FROM conversation_quality WHERE sender_count > 1),
    'messages', (SELECT count(*) FROM cohort_messages),
    'countries', COALESCE((SELECT jsonb_agg(x ORDER BY x.total DESC) FROM (SELECT COALESCE(country,'Sin dato') label, count(*) total FROM members GROUP BY country) x), '[]'::jsonb),
    'organizations', COALESCE((SELECT jsonb_agg(x ORDER BY x.total DESC) FROM (SELECT COALESCE(role,'Sin dato') label, count(*) total FROM members GROUP BY role) x), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_reporting_summary(uuid,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_reporting_summary(uuid,timestamptz,timestamptz) TO authenticated;

COMMENT ON TABLE public.analytics_events IS 'Privacy-conscious product analytics; contains event metadata but no message content.';
COMMENT ON FUNCTION public.get_admin_reporting_summary IS 'Admin-only executive networking report; excludes message bodies.';
