#!/bin/bash

echo "Setting up Vercel environment variables..."

# Add environment variables
echo "https://achuavagkhjenaypawij.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "https://wavesight-backend.vercel.app" | vercel env add NEXT_PUBLIC_API_URL production

echo "Environment variables added successfully!"