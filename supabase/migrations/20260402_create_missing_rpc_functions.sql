-- Create the 4 missing RPC functions that the frontend calls

-- 1. award_xp: Registra XP y actualiza el perfil
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  xp_amount integer;
BEGIN
  xp_amount := CASE p_action
    WHEN 'profile_complete' THEN 50
    WHEN 'conversation_started' THEN 30
    WHEN 'match' THEN 15
    WHEN 'swipe' THEN 2
    ELSE 0
  END;

  IF xp_amount = 0 THEN RETURN; END IF;

  INSERT INTO xp_log (user_id, action, xp_earned)
  VALUES (p_user_id, p_action, xp_amount);

  UPDATE profiles
  SET xp = COALESCE(xp, 0) + xp_amount,
      league = CASE
        WHEN COALESCE(xp, 0) + xp_amount >= 300 THEN 'diamond'
        WHEN COALESCE(xp, 0) + xp_amount >= 200 THEN 'gold'
        WHEN COALESCE(xp, 0) + xp_amount >= 120 THEN 'silver'
        WHEN COALESCE(xp, 0) + xp_amount >= 50 THEN 'bronze'
        ELSE 'none'
      END,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- 2. calculate_compatibility: Calcula compatibilidad entre dos usuarios
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

  SELECT COUNT(*) INTO overlap_count
  FROM unnest(COALESCE(profile_a.offers, '{}')) AS a_offer
  WHERE a_offer = ANY(COALESCE(profile_b.seeks, '{}'));
  score := score + (overlap_count * 10);

  SELECT COUNT(*) INTO overlap_count
  FROM unnest(COALESCE(profile_a.seeks, '{}')) AS a_seek
  WHERE a_seek = ANY(COALESCE(profile_b.offers, '{}'));
  score := score + (overlap_count * 10);

  SELECT COUNT(*) INTO overlap_count
  FROM unnest(COALESCE(profile_a.expertise, '{}')) AS a_exp
  WHERE NOT (a_exp = ANY(COALESCE(profile_b.expertise, '{}')));
  score := score + (overlap_count * 10);

  SELECT COUNT(*) INTO overlap_count
  FROM unnest(COALESCE(profile_a.sectors, '{}')) AS a_sec
  WHERE a_sec = ANY(COALESCE(profile_b.sectors, '{}'));
  score := score + (overlap_count * 7);

  IF profile_a.wants_to_learn = ANY(COALESCE(profile_b.expertise, '{}')) THEN
    score := score + 15;
  END IF;

  IF profile_b.wants_to_learn = ANY(COALESCE(profile_a.expertise, '{}')) THEN
    score := score + 10;
  END IF;

  RETURN LEAST(score, 100);
END;
$$;

-- 3. get_leaderboard: Retorna ranking de usuarios ordenado por XP
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_cohort_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  name text,
  avatar_initials text,
  avatar_color text,
  photo_url text,
  xp integer,
  streak integer,
  league text,
  match_count integer,
  conversations_started integer,
  swipe_count integer,
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.avatar_initials,
    p.avatar_color,
    p.photo_url,
    COALESCE(p.xp, 0) AS xp,
    COALESCE(p.streak, 0) AS streak,
    COALESCE(p.league, 'none') AS league,
    COALESCE(p.match_count, 0) AS match_count,
    COALESCE(p.conversations_started, 0) AS conversations_started,
    COALESCE(p.swipe_count, 0) AS swipe_count,
    ROW_NUMBER() OVER (ORDER BY COALESCE(p.xp, 0) DESC) AS rank
  FROM profiles p
  WHERE p.has_logged_in = true
    AND (
      p_cohort_id IS NULL
      OR p.id IN (SELECT cm.profile_id FROM cohort_members cm WHERE cm.cohort_id = p_cohort_id)
    )
  ORDER BY COALESCE(p.xp, 0) DESC;
END;
$$;

-- 4. get_random_icebreaker: Retorna una pregunta rompehielo aleatoria
CREATE OR REPLACE FUNCTION public.get_random_icebreaker()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result text;
BEGIN
  SELECT question INTO result
  FROM icebreakers
  WHERE is_active = true
  ORDER BY random()
  LIMIT 1;

  RETURN COALESCE(result, 'Hola! Encantado de conectar contigo. Que proyectos tienes en mente?');
END;
$$;
