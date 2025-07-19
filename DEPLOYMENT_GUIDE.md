# WaveSight Web App Deployment Guide

## Quick Deploy to Vercel (Recommended)

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy from the web directory:**
   ```bash
   cd ~/Desktop/WAVESITE\ 2.0/web
   vercel
   ```

3. **Follow the prompts:**
   - Set up and deploy: `Y`
   - Which scope: Select your account
   - Link to existing project: `N`
   - Project name: `wavesight-dashboard`
   - Directory: `./`
   - Override settings: `N`

4. **Set environment variables in Vercel Dashboard:**
   - Go to your project settings
   - Navigate to Environment Variables
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`: `https://achuavagkhjenaypawij.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
     - `NEXT_PUBLIC_API_URL`: `https://your-backend-api.com` (or leave as localhost for now)

### Option 2: Deploy via GitHub Integration

1. **Push your code to GitHub** (already done)

2. **Go to Vercel:**
   - Visit https://vercel.com/new
   - Click "Import Git Repository"
   - Select your GitHub account
   - Choose `WAVESITE-2.0` repository

3. **Configure the project:**
   - Framework Preset: Next.js
   - Root Directory: `web`
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add the same variables as above

5. **Click Deploy**

## Alternative: Deploy to Netlify

1. **Create `netlify.toml` in the web directory:**
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

2. **Deploy via Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   cd ~/Desktop/WAVESITE\ 2.0/web
   netlify deploy
   ```

## Post-Deployment Steps

1. **Update CORS settings in Supabase:**
   - Go to Supabase Dashboard > Settings > API
   - Add your deployment URL to allowed origins

2. **Test the deployment:**
   - Visit your deployed URL
   - Check browser console for any errors
   - Verify data is loading from Supabase

3. **Backend API Deployment** (Optional):
   - Deploy backend to Railway, Render, or Fly.io
   - Update `NEXT_PUBLIC_API_URL` in your deployment

## Troubleshooting

### Build Errors
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors: `npm run build` locally
- Verify environment variables are set

### Data Not Loading
- Check Supabase RLS policies
- Verify environment variables in deployment
- Check browser console for CORS errors

### Performance Issues
- Enable Next.js Image Optimization
- Use Vercel Analytics
- Implement proper caching strategies

## Quick Deploy Command

For the fastest deployment:
```bash
cd ~/Desktop/WAVESITE\ 2.0/web
npx vercel --prod
```

Your app will be live at: `https://wavesight-dashboard.vercel.app`