#!/bin/bash

echo "🚀 Deploying Wavesight to Vercel..."

# Navigate to web directory
cd web

# Build the project first
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🔄 Deploying to Vercel..."

# Set environment variables via Vercel CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production < <(echo "https://aicahushpcslwjwrlqbo.supabase.co") --yes 2>/dev/null
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production < <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w") --yes 2>/dev/null

# Deploy
vercel --prod --yes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Your app is now live on Vercel!"
    echo ""
    echo "Next steps:"
    echo "1. Check your deployment at: https://vercel.com/jeremy-uys-projects/web"
    echo "2. Visit your live app (URL will be shown above)"
    echo "3. Configure custom domain if needed"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    echo ""
    echo "Manual deployment steps:"
    echo "1. Go to https://vercel.com"
    echo "2. Import project from Git"
    echo "3. Set these environment variables:"
    echo "   NEXT_PUBLIC_SUPABASE_URL=https://aicahushpcslwjwrlqbo.supabase.co"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w"
fi