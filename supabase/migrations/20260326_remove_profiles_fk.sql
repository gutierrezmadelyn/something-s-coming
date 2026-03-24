-- Check foreign key constraints on profiles table
-- This is a diagnostic query, not an actual migration

-- Option 1: Remove the foreign key constraint to allow importing users without auth
-- This allows profiles to exist independently of auth.users

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Note: With this change, profiles can be created without a corresponding auth.users entry
-- Users will need to "claim" their profile when they sign up by matching email
