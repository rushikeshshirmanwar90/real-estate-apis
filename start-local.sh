#!/bin/bash

echo "🚀 Starting Real Estate APIs in LOCAL DEVELOPMENT mode..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.local template..."
    cp .env.local .env
fi

# Verify environment
echo "🔍 Verifying environment configuration..."
if grep -q "DOCKER_ENV=false" .env; then
    echo "✅ Environment configured for local development"
else
    echo "⚠️  Warning: DOCKER_ENV should be 'false' for local development"
fi

# Stop any running processes
echo "🛑 Stopping any running Next.js processes..."
pkill -f "next dev" || true

# Clear cache
echo "🗑️  Clearing Next.js cache..."
rm -rf .next

# Start server
echo ""
echo "🎯 Starting development server on port 8080..."
echo "📊 Expected configuration:"
echo "   - Port: 8080"
echo "   - Redis: DISABLED"
echo "   - Domain: http://localhost:8080"
echo ""

npm run dev