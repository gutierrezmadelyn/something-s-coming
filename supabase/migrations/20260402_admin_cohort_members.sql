-- Allow admins to insert/delete cohort_members

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can insert cohort_members" ON cohort_members;
DROP POLICY IF EXISTS "Admins can delete cohort_members" ON cohort_members;
DROP POLICY IF EXISTS "Users can see their cohort memberships" ON cohort_members;

-- Enable RLS if not already enabled
ALTER TABLE cohort_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert cohort_members"
ON cohort_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can delete cohort_members"
ON cohort_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Also allow users to see their own cohort memberships
CREATE POLICY "Users can see their cohort memberships"
ON cohort_members
FOR SELECT
TO authenticated
USING (
  profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);
