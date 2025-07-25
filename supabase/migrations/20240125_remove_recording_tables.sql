-- Migration to remove screen recording related tables and features
-- This removes all recording-related functionality from WAVESITE

-- Drop views that depend on recording tables
DROP VIEW IF EXISTS trending_posts CASCADE;

-- Drop functions related to recordings
DROP FUNCTION IF EXISTS update_recording_session_stats() CASCADE;

-- Drop recording-related tables
DROP TABLE IF EXISTS captured_posts CASCADE;
DROP TABLE IF EXISTS recording_sessions CASCADE;
DROP TABLE IF EXISTS recordings CASCADE;
DROP TABLE IF EXISTS recording_insights CASCADE;

-- Remove storage bucket for recordings
DELETE FROM storage.buckets WHERE id = 'recordings';

-- Remove storage policies for recordings
DROP POLICY IF EXISTS "Users can upload own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own recordings" ON storage.objects;

-- Update any remaining references in other tables
-- (Add any specific cleanup queries here if needed)

-- Add comment to document this change
COMMENT ON SCHEMA public IS 'WAVESITE schema - screen recording features removed on 2024-01-25';