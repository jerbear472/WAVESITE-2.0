# Vercel Deployment Guide

## Prerequisites
- Vercel account (https://vercel.com)
- Vercel CLI installed (`npm i -g vercel`)

## Quick Deploy

### Option 1: Deploy via CLI
```bash
cd web
vercel --prod
```

### Option 2: Deploy via Git
1. Push your code to GitHub
2. Import project in Vercel Dashboard
3. Connect to your GitHub repository

## Environment Variables to Set in Vercel

Go to your Vercel project settings → Environment Variables and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://aicahushpcslwjwrlqbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w
```

## Project Structure
```
web/
├── app/                 # Next.js 14 App Router
├── components/         # React components
├── lib/               # Utilities and configurations
│   └── EARNINGS_STANDARD.ts  # Earnings configuration
├── public/            # Static assets
├── vercel.json        # Vercel configuration
└── package.json       # Dependencies
```

## Deployment Configuration

Your `vercel.json` is already configured with:
- ✅ Next.js framework settings
- ✅ Function timeouts
- ✅ CORS headers for API routes
- ✅ Security headers
- ✅ Region: iad1 (US East)

## Build Command
```bash
npm run build
```

## Important Notes

1. **Database**: Your Supabase instance is already configured and live
2. **Authentication**: Email confirmation is handled by Supabase
3. **Earnings**: Standardized at $1.00 submission, $0.10 validation
4. **RLS Policies**: Already applied via FINAL_RLS_FIX.sql

## Post-Deployment Checklist

- [ ] Verify environment variables are set
- [ ] Test user registration
- [ ] Test trend submission
- [ ] Test validation voting
- [ ] Check earnings calculation
- [ ] Verify image uploads work

## Domains

After deployment, you'll get a URL like:
```
https://your-app-name.vercel.app
```

You can add a custom domain in Vercel settings.

## Monitoring

Check deployment status:
```bash
vercel ls
```

View logs:
```bash
vercel logs
```

## Rollback if Needed
```bash
vercel rollback
```

## Support

The app uses:
- Next.js 14 with App Router
- Supabase for backend
- Tailwind CSS for styling
- TypeScript for type safety