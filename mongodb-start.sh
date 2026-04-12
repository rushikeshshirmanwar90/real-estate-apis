#!/bin/bash

# MongoDB Server Deployment Script
# Use this script on your MONGODB SERVER ONLY

set -e

echo "🗄️  Starting MongoDB Server Setup..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.mongodb-server template..."
    cp .env.mongodb-server .env
    echo "✅ .env file created."
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and change the default password!"
    echo ""
    echo "Required changes:"
    echo "  - MONGO_USERNAME (default: admin)"
    echo "  - MONGO_PASSWORD (MUST CHANGE THIS!)"
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

# Check if docker-compose.mongodb.yml exists
if [ ! -f docker-compose.mongodb.yml ]; then
    echo "❌ docker-compose.mongodb.yml not found!"
    echo "Please make sure you're in the correct directory."
    exit 1
fi

# Pull latest MongoDB image
echo "📥 Pulling latest MongoDB image..."
docker-compose -f docker-compose.mongodb.yml pull

echo ""
echo "🏗️  Starting MongoDB server..."
docker-compose -f docker-compose.mongodb.yml up -d

echo ""
echo "⏳ Waiting for MongoDB to be ready..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.mongodb.yml ps

echo ""
echo "✅ MongoDB server deployment complete!"
echo ""
echo "🔍 Server Information:"
echo "   - MongoDB Port: 27017"
echo "   - Container Name: real-estate-mongodb"
echo ""

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "📍 Server IP Address: $SERVER_IP"
echo ""

# Get credentials from .env
MONGO_USER=$(grep MONGO_USERNAME .env | cut -d '=' -f2)
MONGO_PASS=$(grep MONGO_PASSWORD .env | cut -d '=' -f2)

echo "🔐 Connection String for Application Server:"
echo "   DB_URL=mongodb://$MONGO_USER:$MONGO_PASS@$SERVER_IP:27017/realEstate?authSource=admin"
echo ""

echo "🔒 Security Reminders:"
echo "   1. Configure firewall to allow only your app server:"
echo "      sudo ufw allow from <app-server-ip> to any port 27017"
echo ""
echo "   2. Change default password if you haven't already"
echo ""
echo "   3. Enable firewall:"
echo "      sudo ufw enable"
echo ""

echo "📝 Useful commands:"
echo "   - View logs: docker-compose -f docker-compose.mongodb.yml logs -f"
echo "   - Stop server: docker-compose -f docker-compose.mongodb.yml down"
echo "   - Restart: docker-compose -f docker-compose.mongodb.yml restart"
echo "   - MongoDB shell: docker exec -it real-estate-mongodb mongosh -u $MONGO_USER -p $MONGO_PASS"
echo ""

echo "📚 Documentation:"
echo "   - SEPARATE_MONGODB_DEPLOYMENT.md - Complete deployment guide"
echo ""
