# Vercel Deployment Guide for WAVESITE2

## Prerequisites
- Vercel account (create one at vercel.com)
- Vercel CLI installed (optional): `npm i -g vercel`

## Step 1: Prepare for Deployment

### Update Environment Variables
The following environment variables need to be set in Vercel:

```bash
# Supabase Configuration (from .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://achuavagkhjenaypawij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g

# API Configuration (update for production)
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

## Step 2: Database Setup

Before deploying, ensure your Supabase database has the required tables and storage:

1. **Run Database Migrations** in Supabase SQL Editor:
   ```sql
   -- Execute contents of:
   -- supabase/add_avatar_url_column.sql
   -- supabase/create_avatars_bucket.sql
   ```

2. **Verify Storage Buckets**:
   - Ensure 'avatars' bucket exists and is public
   - Check RLS policies are properly configured

## Step 3: Deploy Using Vercel CLI (Recommended)

1. **Navigate to the web directory**:
   ```bash
   cd /Users/JeremyUys_1/Desktop/WAVESITE2/web
   ```

2. **Deploy with Vercel CLI**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Set up and deploy: Yes
   - Which scope: Select your account
   - Link to existing project?: No (for first deployment)
   - Project name: wavesite2 (or your preferred name)
   - Directory: ./ (current directory)
   - Override settings?: No

4. **Set Environment Variables**:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add NEXT_PUBLIC_API_URL
   ```

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

## Step 4: Deploy Using Vercel Dashboard (Alternative)

1. **Go to** https://vercel.com/new

2. **Import Git Repository**:
   - If your code is on GitHub/GitLab/Bitbucket, connect and import
   - Otherwise, use the CLI method above

3. **Configure Project**:
   - Framework Preset: Next.js
   - Root Directory: `web`
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add each variable from Step 1
   - Select which environments (Production/Preview/Development)

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

## Step 5: Post-Deployment Setup

1. **Update API URL**:
   - Once your backend is deployed, update `NEXT_PUBLIC_API_URL`
   - Redeploy to apply changes

2. **Configure Domain** (optional):
   - In Vercel dashboard, go to Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

3. **Enable Analytics** (optional):
   - In Vercel dashboard, go to Analytics tab
   - Enable Web Analytics

## Step 6: Deploy Backend (Required for Full Functionality)

The backend FastAPI service also needs to be deployed. Options:

1. **Vercel (Python support)**:
   - Create separate project for backend
   - Use vercel.json for Python configuration

2. **Railway/Render**:
   - Better suited for Python/FastAPI
   - Supports background workers

3. **DigitalOcean App Platform**:
   - Good for containerized apps
   - Supports Docker deployment

## Deployment Checklist

- [ ] Environment variables added in Vercel
- [ ] Database migrations run in Supabase
- [ ] Storage buckets configured
- [ ] Backend API deployed and URL updated
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Analytics enabled (optional)

## Common Issues

1. **Build Failures**:
   - Check Node.js version (should be 18.x or 20.x)
   - Ensure all dependencies are in package.json
   - Check for TypeScript errors

2. **Environment Variables Not Working**:
   - Ensure they start with `NEXT_PUBLIC_` for client-side access
   - Redeploy after adding/changing variables

3. **Image Upload Not Working**:
   - Verify Supabase storage bucket exists
   - Check CORS settings in Supabase
   - Ensure RLS policies are correct

## Monitoring

After deployment:
1. Check Vercel dashboard for build logs
2. Monitor Functions tab for API route performance
3. Use Vercel Analytics for user insights
4. Set up error tracking (e.g., Sentry)

## Useful Commands

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs [deployment-url]

# Rollback to previous deployment
vercel rollback

# Remove deployment
vercel rm [deployment-url]
```

## Next Steps

1. Set up CI/CD with GitHub Actions
2. Configure preview deployments for PRs
3. Set up monitoring and alerts
4. Enable Vercel Edge Functions for better performance
5. Configure ISR (Incremental Static Regeneration) for dynamic pages