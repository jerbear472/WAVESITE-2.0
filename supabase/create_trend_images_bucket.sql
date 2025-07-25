-- Create trend-images storage bucket for WaveSite
-- This bucket stores images uploaded with trend submissions

-- Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trend-images', 'trend-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Users can upload trend images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'trend-images' AND 
    auth.role() = 'authenticated'
);

-- Policy: Allow anyone to view trend images (since trends are public once approved)
CREATE POLICY "Anyone can view trend images" ON storage.objects
FOR SELECT USING (bucket_id = 'trend-images');

-- Policy: Allow users to update their own uploaded images
CREATE POLICY "Users can update own trend images" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'trend-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to delete their own uploaded images
CREATE POLICY "Users can delete own trend images" ON storage.objects
FOR DELETE USING (
    bucket_id = 'trend-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_id_name 
ON storage.objects(bucket_id, name) 
WHERE bucket_id = 'trend-images';