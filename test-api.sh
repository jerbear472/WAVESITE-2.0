#!/bin/bash

TIMESTAMP=$(date +%s)
EMAIL="test${TIMESTAMP}@example.com"

echo "Testing signup with email: $EMAIL"

curl -X POST "https://aicahushpcslwjwrlqbo.supabase.co/auth/v1/signup" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"TestPassword123\"}" \
  -s | python3 -m json.tool