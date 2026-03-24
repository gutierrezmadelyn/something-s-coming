-- Migration: Allow admins to insert profiles (for CSV import)
-- Date: 2026-03-23

-- Admins can insert any profile (for importing users)
CREATE POLICY "profiles_admin_insert" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can delete any profile
CREATE POLICY "profiles_admin_delete" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
