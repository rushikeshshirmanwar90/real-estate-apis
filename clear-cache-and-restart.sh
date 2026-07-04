#!/bin/bash

echo "🧹 Clearing Next.js cache and restarting server..."

# Stop any running Next.js processes
echo "🛑 Stopping any running Next.js processes..."
pkill -f "next dev" || true
pkill -f "next start" || true

# Clear Next.js cache
echo "🗑️ Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

# Clear npm cache (optional)
echo "🗑️ Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies (optional, only if needed)
# echo "📦 Reinstalling dependencies..."
# npm install

# Start the development server
echo "🚀 Starting development server..."
npm run dev

echo "✅ Server should now start without middleware/proxy conflicts!"