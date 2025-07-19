# WaveSight Render Deployment Guide

## Prerequisites
- Render account (https://render.com)
- GitHub repository connected

## Deployment Steps

### Option 1: Deploy via Render Dashboard (Recommended)

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com/
   - Click "New +" → "Web Service"

2. **Connect your GitHub repository**
   - Select `WAVESITE-2.0` repository
   - Grant permissions if needed

3. **Configure the Web Service**
   - **Name**: `wavesight-dashboard`
   - **Runtime**: Node
   - **Region**: Oregon (US West)
   - **Branch**: main
   - **Root Directory**: `web`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Set Environment Variables**
   Click "Advanced" and add:
   - `NODE_ENV` = `production`
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://achuavagkhjenaypawij.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g`
   - `NEXT_PUBLIC_API_URL` = `http://localhost:8000` (update later if deploying backend)

5. **Choose Instance Type**
   - Select "Free" for testing
   - Upgrade to "Starter" or higher for production

6. **Click "Create Web Service"**

### Option 2: Deploy using render.yaml

1. **Commit the render.yaml file**
   ```bash
   cd ~/Desktop/WAVESITE\ 2.0
   git add render.yaml package.json RENDER_DEPLOYMENT.md
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Create Blueprint in Render**
   - Go to https://dashboard.render.com/blueprints
   - Click "New Blueprint Instance"
   - Connect your repository
   - Select the branch with render.yaml
   - Deploy

## Post-Deployment

1. **Get your app URL**
   - It will be something like: `https://wavesight-dashboard.onrender.com`

2. **Update Supabase CORS**
   - Go to Supabase Dashboard → Settings → API
   - Add your Render URL to allowed origins

3. **Test the deployment**
   - Visit your Render URL
   - Check that data loads from Supabase
   - Monitor logs in Render dashboard

## Troubleshooting

### Build Failures
- Check Render logs for specific errors
- Ensure all dependencies are in package.json
- Try building locally first: `cd web && npm run build`

### App Not Starting
- Check the start command is correct
- Ensure PORT environment variable is used (Render sets this automatically)
- Look for errors in Render logs

### Slow Initial Load
- Free tier services sleep after 15 minutes of inactivity
- First request will take 30-60 seconds
- Upgrade to paid tier for always-on service

## Deploying Backend (Optional)

To deploy the FastAPI backend:

1. Uncomment the backend service in `render.yaml`
2. Push changes to GitHub
3. Render will automatically detect and deploy both services
4. Update `NEXT_PUBLIC_API_URL` in the web service to point to your backend URL

## Custom Domain

1. Go to your service settings in Render
2. Click "Custom Domains"
3. Add your domain and follow DNS instructions

## Monitoring

- Use Render's built-in metrics
- Set up health checks
- Configure alerts for downtime

Your app should now be deploying on Render!