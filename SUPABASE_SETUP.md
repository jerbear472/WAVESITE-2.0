# Supabase Setup Guide for WaveSight

## Prerequisites
- Supabase project created at https://supabase.com
- Your Supabase credentials (already in .env file)

## Database Setup

### 1. Run the Schema
Go to your Supabase Dashboard > SQL Editor and run the contents of `supabase/schema.sql`

This will create:
- User profiles table (extends Supabase Auth)
- Trend submissions table
- Trend validations table
- Recordings table
- Payments table
- Row Level Security policies
- Automatic user profile creation trigger

### 2. Enable Authentication
In Supabase Dashboard > Authentication > Providers:
- Enable Email/Password authentication
- (Optional) Enable Google, Apple, or other providers

### 3. Storage Buckets
In Supabase Dashboard > Storage:

Create these buckets:
1. `recordings` - for screen recordings
2. `screenshots` - for trend screenshots
3. `avatars` - for user profile pictures

Set bucket policies:
```sql
-- Allow users to upload their own files
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own files
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public to view screenshots
CREATE POLICY "Anyone can view screenshots" ON storage.objects
FOR SELECT USING (bucket_id = 'screenshots');
```

## Backend Configuration

The backend is already configured to use Supabase. Key files:
- `backend/app/core/config.py` - Environment configuration
- `backend/app/core/supabase_client.py` - Supabase client initialization

## Frontend Configuration

The web app is configured with:
- `web/lib/supabase.ts` - Supabase client and types

## Local Development

1. Start the backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

2. Start the web app:
```bash
cd web
npm install
npm run dev
```

## Important Notes

1. **Database Password**: You need to get your database password from Supabase Dashboard > Settings > Database and update the DATABASE_URL in .env

2. **Service Key**: The service key in .env should be your Supabase service role key (found in Settings > API)

3. **Row Level Security**: All tables have RLS enabled. Make sure to test with proper authentication.

4. **Real-time**: To enable real-time updates, go to Supabase Dashboard > Database > Replication and enable the tables you want to track.

## Testing

Create a test user:
```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123',
  options: {
    data: {
      username: 'testuser'
    }
  }
})
```

This will automatically create a user profile due to the trigger function.

## Production Checklist

- [ ] Update ALLOWED_ORIGINS in .env
- [ ] Set DEBUG=False
- [ ] Use production database password
- [ ] Enable email confirmation in Supabase Auth settings
- [ ] Set up proper backup policies
- [ ] Configure rate limiting
- [ ] Set up monitoring/alerts