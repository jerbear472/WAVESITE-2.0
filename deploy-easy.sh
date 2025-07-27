#!/bin/bash

echo "🚀 Easy Deploy Options"
echo "===================="
echo ""
echo "1) Local Development (See changes instantly)"
echo "2) Vercel (Deploy to cloud in 2 minutes)"
echo "3) Docker Compose (Local containerized)"
echo ""
read -p "Choose option (1-3): " choice

case $choice in
  1)
    echo "Starting local development server..."
    cd web && npm run dev
    ;;
  2)
    echo "Deploying to Vercel..."
    cd web && npx vercel --prod
    ;;
  3)
    echo "Starting Docker Compose..."
    docker-compose -f docker-compose-simple.yml up
    ;;
  *)
    echo "Invalid choice"
    ;;
esac