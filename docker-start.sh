#!/bin/bash

# Docker Deployment Script for Real Estate APIs
# For detailed documentation, see:
#   - README_ENV.md (start here!)
#   - ENV_QUICK_REFERENCE.md (quick reference)
#   - DOCKER_DEPLOYMENT.md (Docker guide)

set -e

echo "🚀 Starting Real Estate APIs with Docker..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.docker template..."
    cp .env.docker .env
    echo "✅ .env file created. Please edit it with your credentials before continuing."
    echo ""
    echo "Required changes:"
    echo "  - MONGO_USERNAME and MONGO_PASSWORD"
    echo "  - REDIS_PASSWORD"
    echo "  - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "  - SMTP credentials"
    echo ""
    echo "📚 For help understanding .env files, see:"
    echo "   - README_ENV.md (start here!)"
    echo "   - ENV_QUICK_REFERENCE.md (quick reference)"
    echo ""
    read -p "Press Enter after updating .env file to continue..."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🐳 Docker is running"
echo ""

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose pull

echo ""
echo "🏗️  Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Services:"
echo "   - Application: http://localhost:3000"
echo "   - RedisInsight: http://localhost:8001"
echo "   - MongoDB: localhost:27017"
echo ""
echo "📝 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart: docker-compose restart"
echo ""
echo "📚 Documentation:"
echo "   - README_ENV.md - Environment files guide"
echo "   - ENV_QUICK_REFERENCE.md - Quick reference"
echo "   - CONTAINER_ARCHITECTURE.md - Architecture diagrams"
echo "   - DOCKER_DEPLOYMENT.md - Docker deployment guide"
echo ""
