# 🚨 Fix Trend Submission on Vercel Production

## Issue Identified
The submission is failing because the production environment is missing proper configuration and the API placeholder URL won't work for the proxy.

## Immediate Fix Steps

### 1. Update Vercel Environment Variables
Go to your Vercel dashboard → Project Settings → Environment Variables and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://achuavagkhjenaypawij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g
```

**Important**: Remove the `NEXT_PUBLIC_API_URL` variable or set it to your Vercel app URL.

### 2. Check Supabase Database
1. Go to your Supabase dashboard
2. Run SQL Editor with this query to verify the database is set up:

```sql
-- Check if trend_submissions table exists with all columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trend_submissions' 
ORDER BY ordinal_position;

-- Check if profiles table has data
SELECT COUNT(*) as user_count FROM profiles;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'trend_submissions';
```

### 3. Enable CORS for Your Domain
In Supabase dashboard:
1. Go to Settings → API
2. Add your Vercel domain to allowed origins:
   - `https://your-app.vercel.app`
   - `https://your-custom-domain.com` (if you have one)

### 4. Update Proxy Route for Production
The proxy route needs to handle CORS properly in production.