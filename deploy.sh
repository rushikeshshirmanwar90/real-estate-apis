#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code from git..."
git pull origin main

# Rebuild and restart containers
echo "🔨 Rebuilding Docker containers..."
docker-compose down
docker-compose up --build -d

# Show logs
echo "📋 Showing logs..."
docker-compose logs --tail=50

echo "✅ Deployment complete!"
