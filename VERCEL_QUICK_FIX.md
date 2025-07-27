# 🚀 Quick Fix for Vercel Trend Submission

## Most Likely Issue
The database is missing the `trend_submissions` table or the table doesn't have all required columns.

## 🔧 Quick Fix Steps

### 1. Run Database Fix in Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **SQL Editor**
3. Copy and run the entire content of `fix-submit-trend-foreign-key.sql`
4. You should see: "Trend submissions table is now properly configured..."

### 2. Update Vercel Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://achuavagkhjenaypawij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g
```

**Remove** the `NEXT_PUBLIC_API_URL` variable completely.

### 3. Redeploy
1. Push the updated proxy route: `git add . && git commit -m "Fix proxy for production" && git push`
2. Vercel will auto-deploy

### 4. Test Production
1. Open your Vercel app
2. Login
3. Open browser console (F12)
4. Paste and run the `production-debug.js` script
5. Look for any ❌ errors

## 🎯 Expected Result
When fixed, you should see:
- ✅ Supabase connected
- ✅ Proxy API working
- ✅ Metadata extracted
- ✅ Can read trend_submissions table

## 🆘 If Still Not Working
Run `testMinimalSubmission()` in console to see the exact error message.

Common errors:
- "relation does not exist" → Run the SQL fix
- "violates row-level security" → Check RLS policies
- "foreign key violation" → User doesn't exist in profiles table

## 📱 Test URL
Once fixed, test with:
```
https://www.tiktok.com/@khaby.lame/video/7137423965982686469
```

The form should auto-populate with thumbnail! 🎉