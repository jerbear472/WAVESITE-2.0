-- Temporarily disable RLS for testing voting system
-- Run this in Supabase SQL Editor to bypass RLS temporarily

ALTER TABLE trend_votes DISABLE ROW LEVEL SECURITY;

-- Re-enable with this command after testing:
-- ALTER TABLE trend_votes ENABLE ROW LEVEL SECURITY;