# Fixing Email Confirmation Links

## Problem
Email confirmation links are pointing to localhost instead of your production domain.

## Solution

### 1. Update Environment Variables

#### For Production Deployment:
Update your `.env.production` or deployment environment variables:

```bash
NEXT_PUBLIC_SITE_URL=https://wavesight.app  # Replace with your actual domain
```

#### For Local Development:
Keep `.env.local` as is:
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Update Supabase Dashboard Settings

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Update the following settings:

   **Site URL:**
   ```
   https://wavesight.app
   ```

   **Redirect URLs (add both):**
   ```
   https://wavesight.app/auth/callback
   http://localhost:3000/auth/callback
   ```

### 3. Update Email Templates (Optional)

1. In Supabase Dashboard, go to **Authentication** → **Email Templates**
2. Select "Confirm signup" template
3. The confirmation URL variable `{{ .ConfirmationURL }}` will automatically use your Site URL

### 4. How It Works

The code now uses this priority for email redirect URLs:
1. First checks `NEXT_PUBLIC_SITE_URL` environment variable
2. Falls back to `window.location.origin` if not set

Files updated:
- `/contexts/SimpleAuthContext.tsx` - Line 190
- `/lib/optimizedSupabase.ts` - Line 176

### 5. Testing

1. **Local Testing:**
   - Email links will go to `http://localhost:3000/auth/callback`
   - This works for local development

2. **Production Testing:**
   - Deploy with `NEXT_PUBLIC_SITE_URL=https://wavesight.app`
   - Email links will go to `https://wavesight.app/auth/callback`

### 6. Deployment Checklist

- [ ] Set `NEXT_PUBLIC_SITE_URL` in your deployment platform (Vercel, Netlify, etc.)
- [ ] Update Supabase Dashboard Site URL
- [ ] Add both localhost and production URLs to Redirect URLs
- [ ] Test email confirmation on production

### 7. Common Issues

**Issue:** Still getting localhost links in production
- **Fix:** Ensure environment variable is set in your deployment platform
- **Fix:** Rebuild and redeploy your application

**Issue:** "Invalid callback parameters" error
- **Fix:** Add your domain to Supabase Redirect URLs list

**Issue:** Email not received
- **Fix:** Check Supabase email logs: Dashboard → Logs → Auth

## Environment Variables Reference

```bash
# Development (.env.local)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Production (.env.production)
NEXT_PUBLIC_SITE_URL=https://wavesight.app  # Your actual domain
```

## Quick Fix for Immediate Production Use

If you need to deploy immediately and can't wait for DNS/domain setup:

1. Deploy to Vercel/Netlify (get the auto-generated URL like `wavesight-abc123.vercel.app`)
2. Update `NEXT_PUBLIC_SITE_URL` to that URL
3. Add that URL to Supabase Redirect URLs
4. Redeploy

Later, when you have your custom domain:
1. Update `NEXT_PUBLIC_SITE_URL` to your custom domain
2. Update Supabase settings
3. Redeploy