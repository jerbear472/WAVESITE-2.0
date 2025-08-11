# Vercel Deployment Checklist

## ✅ You've Updated Vercel Environment Variables

Great! Since you've updated the ANON_KEY and SERVICE_KEY in Vercel, your deployment should now use the new Supabase instance.

## Required Environment Variables in Vercel

Make sure ALL of these are set to the NEW values:

```
NEXT_PUBLIC_SUPABASE_URL=https://aicahushpcslwjwrlqbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w
```

Optional (if your backend needs it):
```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg4NzU1NCwiZXhwIjoyMDcwNDYzNTU0fQ.0VJxNsrW0NDUXyRGbjEqmSu6ugf3J78khKoRpIIMK6w
```

## Trigger a Redeploy

After updating environment variables, you need to redeploy:

### Option 1: Automatic
- Push any small change to trigger auto-deploy
- Or wait for next push

### Option 2: Manual
1. Go to Vercel Dashboard
2. Click on your project
3. Go to "Deployments" tab
4. Click "..." on the latest deployment
5. Click "Redeploy"
6. Choose "Use existing Build Cache" = NO (important!)

## Verify the Deployment

### Test 1: Check Authentication
1. Open your Vercel app URL
2. Try to login with OLD credentials
   - Should FAIL (user doesn't exist in new database)
3. Try with NEW credentials:
   ```
   Email: tester.1754889443@wavesight.com
   Password: Test123!
   ```
   - Should SUCCEED

### Test 2: Check for Errors
1. Open browser DevTools (F12)
2. Go to Network tab
3. Look for Supabase requests
4. URL should contain: `aicahushpcslwjwrlqbo`
5. Should NOT see numeric overflow errors

### Test 3: Create New Account
1. Try registering a new account
2. Should work without email confirmation
3. Should be able to submit trends without errors

## Clear Browser Cache

If you're still seeing old data:

### Chrome/Edge:
1. Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Or: Settings → Privacy → Clear browsing data
3. Select "Cached images and files"
4. Clear for "All time"

### Safari:
1. Develop menu → Empty Caches
2. Or: Cmd+Option+E

### Firefox:
1. Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Or: Settings → Privacy → Clear Data

## Troubleshooting

### "Numeric overflow" errors
- ❌ Still using old database
- Check Vercel env vars again
- Redeploy without cache

### Can login with old accounts
- ❌ Browser cache issue
- Clear all browser data for your domain
- Try incognito/private window

### Can't login at all
- ✅ This is expected! Old accounts don't exist
- Create new account or use test credentials

### "User not found" errors
- ✅ Good! This means you're on new database
- Old users don't exist in new instance

## Success Indicators

You know it's working when:
- ✅ Old accounts can't login
- ✅ New accounts can be created
- ✅ No numeric overflow errors
- ✅ Test account works: tester.1754889443@wavesight.com
- ✅ Trends can be submitted without errors
- ✅ Validation voting works

## Database Check

The NEW database has:
- Fresh schema (from FRESH_START_SCHEMA.sql)
- No legacy views causing issues
- Proper column types (no overflow)
- Test users created by our scripts

The OLD database had:
- Numeric overflow issues
- Ambiguous column errors
- Your old user accounts
- Problematic views

## Summary

Since you've updated the Vercel environment variables:
1. ✅ Code is updated (we pushed all changes)
2. ✅ Vercel env vars updated (you just did this)
3. 🔄 Need to redeploy to apply changes
4. 🔄 Clear browser cache
5. 🔄 Test with new credentials

Your app should now be fully migrated to the new Supabase instance!