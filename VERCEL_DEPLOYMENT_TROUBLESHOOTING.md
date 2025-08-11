# Vercel Deployment Troubleshooting

## If signup still doesn't work on Vercel:

### 1. Check Environment Variables
Make sure these are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://aicahushpcslwjwrlqbo.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your anon key

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

### 2. Force Redeploy
If the deployment didn't trigger automatically:

```bash
# Option A: Trigger via Vercel CLI
vercel --prod

# Option B: Trigger via empty commit
git commit --allow-empty -m "Trigger Vercel redeploy"
git push origin main

# Option C: Manual trigger
# Go to Vercel Dashboard → Your Project → Deployments → Redeploy
```

### 3. Clear Build Cache
In Vercel Dashboard:
1. Go to your project
2. Settings → Functions
3. Click "Clear Cache"
4. Redeploy

### 4. Check Build Logs
Look for any build errors in Vercel:
1. Go to your project dashboard
2. Click on the latest deployment
3. View "Build Logs" tab
4. Look for any errors related to environment variables or build failures

### 5. Verify Runtime Logs
After deployment, check runtime logs:
1. Go to your project dashboard
2. Functions tab
3. View logs for any runtime errors

## Quick Redeploy Command

Run this to force a redeploy with an empty commit:
```bash
git commit --allow-empty -m "Force Vercel redeploy - fix signup issue"
git push origin main
```