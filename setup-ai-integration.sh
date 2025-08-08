#!/bin/bash

# WaveSight AI Integration Setup Script
# Run this to set up the AI features in your environment

echo "🚀 Setting up WaveSight AI Integration..."

# Check if we're in the right directory
if [ ! -f "WaveSight_AI_Spec_v1.0.md" ]; then
    echo "❌ Error: Please run this script from the WAVESITE2 directory"
    exit 1
fi

# Step 1: Install dependencies
echo "📦 Installing AI dependencies..."
cd web
npm install openai@latest
npm install @types/node@latest
cd ..

# Step 2: Apply database migrations
echo "🗄️ Applying AI schema extensions..."
if [ -f ".env" ]; then
    source .env
    echo "Running database migrations..."
    
    # You'll need to run this against your Supabase instance
    # psql $DATABASE_URL < supabase/ai-schema-extensions.sql
    
    echo "✅ Database schema updated (manual step required - run the SQL file in Supabase dashboard)"
else
    echo "⚠️ Warning: .env file not found. Please configure your environment variables."
fi

# Step 3: Set up environment variables
echo "🔧 Checking environment variables..."
if ! grep -q "OPENAI_API_KEY" .env 2>/dev/null; then
    echo ""
    echo "⚠️ Please add the following to your .env file:"
    echo "OPENAI_API_KEY=your_openai_api_key_here"
    echo ""
fi

# Step 4: Create cron job configuration
echo "⏰ Setting up cron jobs..."
cat > vercel.json << 'EOF'
{
  "crons": [
    {
      "path": "/api/cron/cluster-trends",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/score-trends",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/predict-trends",
      "schedule": "0 2 * * *"
    }
  ]
}
EOF

# Step 5: Create cron endpoints
echo "📝 Creating cron job endpoints..."
mkdir -p web/app/api/cron

cat > web/app/api/cron/cluster-trends/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import { backgroundJobs } from '@/lib/backgroundJobs';

export async function GET() {
  try {
    await backgroundJobs.clusterTrends();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
EOF

cat > web/app/api/cron/score-trends/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import { backgroundJobs } from '@/lib/backgroundJobs';

export async function GET() {
  try {
    await backgroundJobs.scoreTrends();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
EOF

cat > web/app/api/cron/predict-trends/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import { backgroundJobs } from '@/lib/backgroundJobs';

export async function GET() {
  try {
    await backgroundJobs.predictTrends();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
EOF

echo "✅ Cron job endpoints created"

# Step 6: Summary
echo ""
echo "========================================="
echo "✅ AI Integration Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Add your OPENAI_API_KEY to the .env file"
echo "2. Run the SQL migration in Supabase:"
echo "   - Go to Supabase Dashboard > SQL Editor"
echo "   - Copy contents of supabase/ai-schema-extensions.sql"
echo "   - Execute the SQL"
echo "3. Deploy to Vercel for automatic cron jobs"
echo "4. Test the AI endpoints:"
echo "   - POST /api/trends/submit-ai"
echo "   - GET /api/dashboard/ai?endpoint=overview"
echo ""
echo "For local development, start the cron scheduler:"
echo "   npm run dev:cron"
echo ""
echo "🎉 Happy trend hunting with AI!"