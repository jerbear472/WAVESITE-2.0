# WaveSight Database Setup

## Quick Setup

The `captured_trends` table needs to be created in your Supabase database. Follow these steps:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://app.supabase.com/project/achuavagkhjenaypawij
2. Navigate to the SQL Editor (left sidebar)
3. Click "New Query"
4. Copy and paste the contents of `supabase/migrations/001_create_captured_trends.sql`
5. Click "Run" to execute the SQL

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
cd mobile
supabase db push
```

### Option 3: Manual SQL

Run this SQL in your Supabase SQL editor:

```sql
-- Create captured_trends table
CREATE TABLE IF NOT EXISTS captured_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  hashtags TEXT,
  metadata JSONB DEFAULT '{}',
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_trending BOOLEAN DEFAULT FALSE,
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_captured_trends_user_id ON captured_trends(user_id);
CREATE INDEX idx_captured_trends_platform ON captured_trends(platform);
CREATE INDEX idx_captured_trends_captured_at ON captured_trends(captured_at DESC);
CREATE INDEX idx_captured_trends_is_trending ON captured_trends(is_trending);

-- Create unique constraint to prevent duplicate captures
CREATE UNIQUE INDEX idx_captured_trends_user_url ON captured_trends(user_id, url);

-- Enable Row Level Security
ALTER TABLE captured_trends ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own captured trends"
  ON captured_trends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own captured trends"
  ON captured_trends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own captured trends"
  ON captured_trends FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own captured trends"
  ON captured_trends FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_captured_trends_updated_at
  BEFORE UPDATE ON captured_trends
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Verify Setup

After running the SQL, verify the table was created:

1. Go to Table Editor in Supabase
2. You should see `captured_trends` in the list
3. Check that RLS is enabled (shield icon should be active)

## Troubleshooting

### Table already exists error
If you get an error that the table already exists, you can drop it first:
```sql
DROP TABLE IF EXISTS captured_trends CASCADE;
```
Then run the creation SQL again.

### Permission errors
Make sure you're logged in as an admin user in Supabase dashboard.

### RLS errors
If you have issues with Row Level Security, ensure your user is authenticated when making requests from the app.