# Manual Vercel Deployment Guide

Your app builds successfully! Now deploy it manually to Vercel.

## Option 1: Deploy via GitHub (Recommended)

1. **Push your code to GitHub:**
```bash
git add .
git commit -m "Fresh Supabase instance with standardized earnings"
git push origin main
```

2. **Import to Vercel:**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Select the `/web` directory as the root directory
   - Click "Deploy"

3. **Set Environment Variables:**
   In Vercel project settings → Environment Variables, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://aicahushpcslwjwrlqbo.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w
   ```

## Option 2: Deploy via Vercel CLI (Fix Required)

The Vercel CLI has a path configuration issue. To fix:

1. Go to https://vercel.com/jeremy-uys-projects/web/settings
2. Change the "Root Directory" from `~/Desktop/WAVESITE2/web/web` to `.`
3. Save changes
4. Then run:
   ```bash
   cd /Users/JeremyUys_1/Desktop/WAVESITE2/web
   npx vercel --prod
   ```

## Option 3: Create New Vercel Project

1. Delete the misconfigured project:
   ```bash
   cd /Users/JeremyUys_1/Desktop/WAVESITE2/web
   rm -rf .vercel
   ```

2. Create new project:
   ```bash
   npx vercel
   ```
   - When asked "Set up and deploy?", choose Yes
   - When asked "Which scope?", choose your account
   - When asked "Link to existing project?", choose No
   - Enter a project name: `wavesight-app`
   - When asked "In which directory is your code?", press Enter (current directory)
   - When asked "Want to modify settings?", choose No

## Build Information

✅ **Build Status**: Successful
- Next.js 14.0.3
- 64 pages generated
- Build warnings are non-critical

## Test Locally First

Your app is running locally at: http://localhost:3001

Test these features before deploying:
- ✅ User login
- ✅ Trend submission ($1.00)
- ✅ Validation voting ($0.10)
- ✅ Earnings display

## Production URLs

Once deployed, your app will be available at:
- Vercel URL: `https://[your-project-name].vercel.app`
- Custom domain: Configure in Vercel settings

## Support

If you encounter issues:
1. Check build logs in Vercel dashboard
2. Verify environment variables are set
3. Ensure Supabase instance is accessible

Your database and earnings system are fully configured and ready for production!