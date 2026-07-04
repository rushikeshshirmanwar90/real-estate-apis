#!/bin/bash

echo "🐳 Starting Real Estate APIs in DOCKER mode..."
echo ""

# Check if .env.docker exists
if [ ! -f .env.docker ]; then
    echo "❌ Error: .env.docker not found!"
    echo "Please create .env.docker with Docker configuration"
    exit 1
fi

# Stop any local development servers
echo "🛑 Stopping any local development servers..."
pkill -f "next dev" || true

# Stop existing containers
echo "🛑 Stopping existing Docker containers..."
docker-compose down

# Start containers
echo "🚀 Starting Docker containers..."
echo "📊 Expected configuration:"
echo "   - Port: 3000"
echo "   - Redis: ENABLED (Docker service)"
echo "   - Domain: https://xsite.tech"
echo ""

docker-compose up -d

# Wait for containers to start
echo ""
echo "⏳ Waiting for containers to start..."
sleep 5

# Show status
echo ""
echo "📊 Container Status:"
docker-compose ps

# Show logs
echo ""
echo "📝 Recent logs (press Ctrl+C to exit log view):"
echo ""
docker-compose logs -f --tail=50