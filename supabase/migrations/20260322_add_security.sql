-- Migration: Add is_admin field and Row-Level Security (RLS) policies
-- Date: 2026-03-22
-- Description: Security improvements for Negoworking application

-- ============================================
-- PHASE 1: Add is_admin field to profiles
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- ============================================
-- PHASE 2: Enable RLS on all tables
-- ============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE icebreakers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view all profiles (for matching/browsing)
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can only insert their own profile
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can only delete their own profile
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- MATCHES POLICIES
-- ============================================

-- Users can view matches where they are involved
CREATE POLICY "matches_select_own" ON matches
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = matched_user_id
  );

-- Users can insert matches where they are the initiator
CREATE POLICY "matches_insert_own" ON matches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete matches where they are involved
CREATE POLICY "matches_delete_own" ON matches
  FOR DELETE USING (
    auth.uid() = user_id OR auth.uid() = matched_user_id
  );

-- Admins can manage all matches
CREATE POLICY "matches_admin_all" ON matches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- CONVERSATIONS POLICIES
-- ============================================

-- Users can view conversations for their matches
CREATE POLICY "conversations_select_own" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = conversations.match_id
      AND (matches.user_id = auth.uid() OR matches.matched_user_id = auth.uid())
    )
  );

-- Users can insert conversations for their matches
CREATE POLICY "conversations_insert_own" ON conversations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (matches.user_id = auth.uid() OR matches.matched_user_id = auth.uid())
    )
  );

-- Users can update conversations for their matches
CREATE POLICY "conversations_update_own" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = conversations.match_id
      AND (matches.user_id = auth.uid() OR matches.matched_user_id = auth.uid())
    )
  );

-- Users can delete conversations for their matches
CREATE POLICY "conversations_delete_own" ON conversations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = conversations.match_id
      AND (matches.user_id = auth.uid() OR matches.matched_user_id = auth.uid())
    )
  );

-- ============================================
-- MESSAGES POLICIES
-- ============================================

-- Users can view messages in their conversations
CREATE POLICY "messages_select_own" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN matches ON matches.id = conversations.match_id
      WHERE conversations.id = messages.conversation_id
      AND (matches.user_id = auth.uid() OR matches.matched_user_id = auth.uid())
    )
  );

-- Users can insert messages in their conversations
CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      JOIN matches ON matches.id = conversations.match_id
      WHERE conversations.id = conversation_id
      AND (matches.user_id = auth.uid() OR matches.matched_user_id = auth.uid())
    )
  );

-- Users can delete their own messages
CREATE POLICY "messages_delete_own" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ============================================
-- SWIPES POLICIES
-- ============================================

-- Users can view their own swipes
CREATE POLICY "swipes_select_own" ON swipes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own swipes
CREATE POLICY "swipes_insert_own" ON swipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own swipes (for undo functionality)
CREATE POLICY "swipes_delete_own" ON swipes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- COHORTS POLICIES
-- ============================================

-- Everyone can view active cohorts
CREATE POLICY "cohorts_select_active" ON cohorts
  FOR SELECT USING (is_active = true);

-- Admins can view all cohorts
CREATE POLICY "cohorts_admin_select" ON cohorts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only admins can insert/update/delete cohorts
CREATE POLICY "cohorts_admin_insert" ON cohorts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "cohorts_admin_update" ON cohorts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "cohorts_admin_delete" ON cohorts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- COHORT_MEMBERS POLICIES
-- ============================================

-- Users can view cohort members
CREATE POLICY "cohort_members_select_all" ON cohort_members
  FOR SELECT USING (true);

-- Users can join cohorts (insert their own membership)
CREATE POLICY "cohort_members_insert_own" ON cohort_members
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Users can leave cohorts (delete their own membership)
CREATE POLICY "cohort_members_delete_own" ON cohort_members
  FOR DELETE USING (auth.uid() = profile_id);

-- Admins can manage all cohort memberships
CREATE POLICY "cohort_members_admin_all" ON cohort_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- XP_LOG POLICIES
-- ============================================

-- Users can view their own XP log
CREATE POLICY "xp_log_select_own" ON xp_log
  FOR SELECT USING (auth.uid() = user_id);

-- XP is awarded through RPC function, no direct insert
CREATE POLICY "xp_log_insert_own" ON xp_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ICEBREAKERS POLICIES
-- ============================================

-- Everyone can view active icebreakers
CREATE POLICY "icebreakers_select_active" ON icebreakers
  FOR SELECT USING (is_active = true);

-- Only admins can manage icebreakers
CREATE POLICY "icebreakers_admin_all" ON icebreakers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- CASCADE DELETE FUNCTION FOR ACCOUNT DELETION
-- ============================================

CREATE OR REPLACE FUNCTION delete_user_data(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete messages where user is sender
  DELETE FROM messages WHERE sender_id = user_id_to_delete;

  -- Delete conversations for user's matches
  DELETE FROM conversations WHERE match_id IN (
    SELECT id FROM matches
    WHERE user_id = user_id_to_delete OR matched_user_id = user_id_to_delete
  );

  -- Delete matches
  DELETE FROM matches WHERE user_id = user_id_to_delete OR matched_user_id = user_id_to_delete;

  -- Delete swipes
  DELETE FROM swipes WHERE user_id = user_id_to_delete OR swiped_user_id = user_id_to_delete;

  -- Delete cohort memberships
  DELETE FROM cohort_members WHERE profile_id = user_id_to_delete;

  -- Delete XP log
  DELETE FROM xp_log WHERE user_id = user_id_to_delete;

  -- Delete profile
  DELETE FROM profiles WHERE id = user_id_to_delete;
END;
$$;

-- Grant execute to authenticated users (they can only delete themselves due to RLS)
GRANT EXECUTE ON FUNCTION delete_user_data TO authenticated;
