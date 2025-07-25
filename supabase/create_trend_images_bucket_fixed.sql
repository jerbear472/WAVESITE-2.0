-- Create trend-images storage bucket for WaveSite
-- This bucket stores images uploaded with trend submissions

-- Step 1: Create the bucket (this should work with your permissions)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trend-images', 'trend-images', true)
ON CONFLICT (id) DO NOTHING;

-- Note: Storage policies need to be created through Supabase Dashboard
-- The policies below are provided as reference for what needs to be set up

/*
Storage Policies to be created in Supabase Dashboard:

1. Navigate to Storage > Policies in your Supabase Dashboard
2. Select the 'trend-images' bucket
3. Create the following policies:

Policy 1: INSERT - "Users can upload trend images"
- Allowed operation: INSERT
- Target roles: authenticated
- WITH CHECK expression: true

Policy 2: SELECT - "Anyone can view trend images"  
- Allowed operation: SELECT
- Target roles: anon, authenticated
- USING expression: true

Policy 3: UPDATE - "Users can update own trend images"
- Allowed operation: UPDATE  
- Target roles: authenticated
- USING expression: auth.uid()::text = (storage.foldername(name))[1]

Policy 4: DELETE - "Users can delete own trend images"
- Allowed operation: DELETE
- Target roles: authenticated  
- USING expression: auth.uid()::text = (storage.foldername(name))[1]
*/

-- Verify the bucket was created
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'trend-images';