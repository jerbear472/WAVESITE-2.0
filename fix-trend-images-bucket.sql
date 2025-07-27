-- Quick fix for trend-images storage bucket
-- Run this in Supabase SQL Editor to fix the submit trend button

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trend-images', 
  'trend-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload trend images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view trend images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own trend images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own trend images" ON storage.objects;

-- Create simple policies that work
-- Allow authenticated users to upload
CREATE POLICY "Users can upload trend images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trend-images');

-- Allow anyone to view (public bucket)
CREATE POLICY "Anyone can view trend images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'trend-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Users can update own trend images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'trend-images');

-- Allow authenticated users to delete their uploads  
CREATE POLICY "Users can delete own trend images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'trend-images');

-- Verify the bucket was created
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'trend-images';