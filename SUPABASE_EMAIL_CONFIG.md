# Supabase Email Configuration Guide

## Problem
Email confirmation links are redirecting to localhost instead of production URL.

## Solution
You need to update the Supabase Auth settings in your Supabase Dashboard.

### Steps to Fix:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo
   - Navigate to: Authentication → URL Configuration

2. **Update Site URL**
   - Change from: `http://localhost:3000`
   - Change to: `https://wavesight.app` (or your production domain)

3. **Update Redirect URLs**
   Add these to the allowed redirect URLs:
   - `https://wavesight.app/*`
   - `https://wavesight.app/auth/callback`
   - `http://localhost:3000/*` (keep for local development)
   - `http://localhost:3000/auth/callback` (keep for local development)

4. **Update Email Templates** (optional but recommended)
   - Go to: Authentication → Email Templates
   - Update the confirmation email template
   - Replace any hardcoded localhost URLs with: `{{ .SiteURL }}`

### Environment Variables to Update:

For production deployment, update these in your `.env.production`:

```env
NEXT_PUBLIC_SITE_URL=https://wavesight.app
NEXT_PUBLIC_APP_URL=https://wavesight.app
```

### Vercel Environment Variables:

If deploying to Vercel, add these environment variables:
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add:
   - `NEXT_PUBLIC_SITE_URL` = `https://wavesight.app`
   - `NEXT_PUBLIC_APP_URL` = `https://wavesight.app`
   - All other Supabase keys from `.env.local`

### Testing:
After updating, test the flow:
1. Sign up with a new email
2. Check that the confirmation email links to your production domain
3. Verify the redirect works correctly

## Important Notes:
- The Site URL in Supabase Dashboard is what controls the email links
- Keep localhost URLs in the redirect allow list for development
- The `emailRedirectTo` in code is a fallback, but Supabase templates use dashboard settings