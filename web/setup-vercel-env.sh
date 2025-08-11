#!/bin/bash

echo "Setting up Vercel environment variables..."

# Add environment variables
echo "https://aicahushpcslwjwrlqbo.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "https://wavesight-backend.vercel.app" | vercel env add NEXT_PUBLIC_API_URL production

echo "Environment variables added successfully!"