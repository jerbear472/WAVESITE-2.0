# Fix Supabase Connection Issues

## The Problem
You're still getting numeric overflow errors because the app is connecting to the OLD Supabase instance.

## How to Fix

### 1. Clear Browser Cache (IMPORTANT!)
Visit: http://localhost:3001/clear-cache

This will:
- Clear localStorage
- Clear sessionStorage  
- Clear cookies
- Redirect you to login

### 2. Verify Configuration
All these files should have the NEW Supabase URL (`aicahushpcslwjwrlqbo`):
- ✅ `/web/.env.local`
- ✅ `/web/.env.production`
- ✅ `/web/next.config.js` (just fixed)
- ✅ `/.env` (root)

### 3. Restart Everything
```bash
# Kill the dev server (Ctrl+C)
# Clear Next.js cache
rm -rf web/.next

# Restart
cd web
npm run dev
```

### 4. Test with NEW Account
You CANNOT use old accounts! The new Supabase has different users.

**New Test Account:**
```
Email: tester.1754889443@wavesight.com
Password: Test123!
```

If this account doesn't work, create a new one with:
```bash
node create-confirmed-user.js
```

### 5. Verify Connection
Visit: http://localhost:3001/test-supabase

This page will show:
- Which Supabase URL is active
- Whether it's OLD or NEW
- What users exist in the database

## Key Differences

### OLD Supabase (PROBLEMS)
- URL contains: `achuavagkhjenaypawij`
- Has your old user accounts
- Causes numeric overflow errors
- Has problematic views

### NEW Supabase (SOLUTION)
- URL contains: `aicahushpcslwjwrlqbo`
- Fresh, no old accounts
- No numeric overflow issues
- Clean schema

## If Still Having Issues

1. **Hard Refresh Browser**
   - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Clear all browsing data for localhost

2. **Check Browser DevTools**
   - Open Network tab
   - Look for requests to Supabase
   - Should see `aicahushpcslwjwrlqbo` not `achuavagkhjenaypawij`

3. **Create Fresh User**
   ```bash
   node create-confirmed-user.js
   ```
   This will create a new user in the NEW database

## Summary

The numeric overflow happens because:
1. You're still connected to OLD Supabase
2. Browser is caching old credentials
3. Old database has column type issues

Solution:
1. Clear all caches
2. Use NEW test accounts
3. Verify you see `aicahushpcslwjwrlqbo` in URLs