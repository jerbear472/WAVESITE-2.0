# Vercel Environment Variables Setup Guide

## Required Environment Variables

You need to add these environment variables to your Vercel project for the app to work:

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Click on your project (WAVESITE-2.0 or similar)
3. Click on "Settings" tab
4. Click on "Environment Variables" in the left sidebar

### Step 2: Add These Variables

Click "Add New" and add each of these:

#### 1. Supabase URL (REQUIRED)
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://aicahushpcslwjwrlqbo.supabase.co`
- **Environment**: Production, Preview, Development (check all)

#### 2. Supabase Anon Key (REQUIRED)
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w`
- **Environment**: Production, Preview, Development (check all)

#### 3. API URL (OPTIONAL - only if using backend)
- **Key**: `NEXT_PUBLIC_API_URL`
- **Value**: Leave empty or set to your backend URL if deployed
- **Environment**: Production, Preview, Development

#### 4. Site URL (OPTIONAL)
- **Key**: `NEXT_PUBLIC_SITE_URL`
- **Value**: Your Vercel app URL (e.g., `https://your-app.vercel.app`)
- **Environment**: Production

### Step 3: Save and Redeploy

After adding all variables:
1. Click "Save" for each variable
2. Go to "Deployments" tab
3. Click on the three dots next to your latest deployment
4. Click "Redeploy"
5. Click "Redeploy" again in the confirmation dialog

### Step 4: Verify Variables Are Set

You can verify by visiting:
`https://your-app.vercel.app/test-env`

This page will show if the environment variables are properly loaded.

## Common Issues

### If variables are not working:
1. **Make sure the names are EXACT** - they are case-sensitive
2. **Include the NEXT_PUBLIC_ prefix** - Required for client-side variables
3. **Check all environment checkboxes** - Production, Preview, Development
4. **Redeploy after adding** - Changes only take effect after redeployment

### Quick Copy-Paste Values:

```
NEXT_PUBLIC_SUPABASE_URL=https://aicahushpcslwjwrlqbo.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w
```

## Using Vercel CLI (Alternative Method)

If you have Vercel CLI installed:

```bash
# Add environment variables via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste the value when prompted

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste the value when prompted

# Then redeploy
vercel --prod
```

## Verification Checklist

- [ ] NEXT_PUBLIC_SUPABASE_URL is set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY is set
- [ ] Values are copied exactly (no extra spaces)
- [ ] Applied to Production environment
- [ ] Redeployed after adding variables
- [ ] Test signup works at /register