# Manual Deployment Instructions for Wave Score Feature

Since the automated deployment is having issues, here are manual steps to deploy the Wave Score feature:

## Step 1: Apply Database Migration

1. **Go to your Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste this SQL:

```sql
-- Add wave_score column to trend_submissions table
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS wave_score INTEGER 
CHECK (wave_score >= 0 AND wave_score <= 100);

-- Add comment to explain the column
COMMENT ON COLUMN trend_submissions.wave_score IS 'User-submitted coolness rating for the trend (0-100 scale)';

-- Update any existing rows to have a default wave_score of 50
UPDATE trend_submissions 
SET wave_score = 50 
WHERE wave_score IS NULL;
```

4. Click **Run**

## Step 2: Deploy via Vercel (Recommended for Frontend)

Since Kubernetes is having image pull issues, let's deploy the frontend via Vercel:

```bash
cd ~/Desktop/wavesite2/web
npx vercel --prod
```

This will deploy your frontend changes immediately.

## Step 3: Alternative - Fix Docker Images

If you need to fix the Kubernetes deployment:

1. **Login to Docker Hub:**
```bash
docker login
# Username: jerbear472
# Password: [your password]
```

2. **Build and push frontend:**
```bash
cd ~/Desktop/wavesite2/web
docker build -t jerbear472/wavesight-web:latest .
docker push jerbear472/wavesight-web:latest
```

3. **Build and push backend:**
```bash
cd ~/Desktop/wavesite2/backend
docker build -t jerbear472/wavesight-backend:latest .
docker push jerbear472/wavesight-backend:latest
```

4. **Delete failed pods and restart:**
```bash
kubectl delete pods -n wavesight --field-selector=status.phase!=Running
kubectl rollout restart deployment/wavesight-web -n wavesight
kubectl rollout restart deployment/wavesight-backend -n wavesight
```

## Step 4: Verify Deployment

1. **For Vercel deployment:**
   - Visit your Vercel URL
   - Go to the trend submission form
   - Check for Wave Score slider in Step 2

2. **For Kubernetes deployment:**
   - Visit http://134.199.179.19/dashboard
   - Go to the trend submission form
   - Check for Wave Score slider in Step 2

## Files Changed

### Frontend:
- `web/components/TrendSubmissionForm.tsx` - Added Wave Score slider
- `web/app/globals.css` - Added slider styling

### Backend:
- `backend/app/models/models.py` - Added wave_score field
- `backend/app/schemas/trends.py` - Added wave_score validation
- `backend/app/schemas/trends_updated.py` - Added wave_score to all schemas
- `backend/app/api/v1/trends_enhanced.py` - Added wave_score handling

### Database:
- `supabase/schema.sql` - Updated schema
- `add-wave-score-column.sql` - Migration script

## Troubleshooting

If deployment fails:
1. Check Docker Hub login: `docker login`
2. Ensure you have push permissions to jerbear472/wavesight-* repositories
3. Check Kubernetes namespace: `kubectl get pods -n wavesight`
4. For Vercel issues, check: `vercel logs`