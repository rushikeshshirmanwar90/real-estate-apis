# Complete Setup Guide

## Overview

This application can be deployed in two ways:
1. **Docker Deployment** (Recommended) - All services in containers
2. **Cloud Deployment** - Using MongoDB Atlas and external Redis

---

## Option 1: Docker Deployment (Local/Self-Hosted)

### What You Get
- MongoDB container (local database)
- Redis container (local cache)
- Web application container
- All data persisted in Docker volumes

### Step-by-Step Setup

#### 1. Prerequisites
```bash
# Check Docker installation
docker --version
docker-compose --version
```

#### 2. Configure Environment
```bash
# Copy the Docker environment template
cp .env.docker .env

# Edit the .env file
nano .env  # or use your preferred editor
```

Update these critical values:
```env
MONGO_USERNAME=admin
MONGO_PASSWORD=YourSecurePassword123!
REDIS_PASSWORD=YourRedisPassword123!
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

#### 3. Start Services
```bash
# Option A: Use the helper script
./docker-start.sh

# Option B: Manual start
docker-compose up -d
```

#### 4. Verify Deployment
```bash
# Check all services are running
docker-compose ps

# View logs
docker-compose logs -f web
```

#### 5. Access Your Application
- **Application**: http://localhost:3000
- **RedisInsight**: http://localhost:8001
- **MongoDB**: localhost:27017

### Managing Docker Deployment

```bash
# Stop all services
docker-compose down

# Restart a service
docker-compose restart web

# View logs
docker-compose logs -f

# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p yourpassword

# Backup database
docker-compose exec mongodb mongodump --out /data/backup
```

---

## Option 2: Cloud Deployment (Vercel/Railway/etc.)

### What You Get
- MongoDB Atlas (cloud database)
- External Redis service
- Application deployed on cloud platform

### Step-by-Step Setup

#### 1. Setup MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP (or use 0.0.0.0/0 for all IPs)
5. Get your connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/realEstate?retryWrites=true&w=majority
   ```

#### 2. Setup Redis (Optional)
Choose one:
- [Redis Cloud](https://redis.com/try-free/)
- [Upstash](https://upstash.com/)
- Set `REDIS_ENABLED=false` to disable

#### 3. Configure Environment Variables

For **Vercel**:
1. Go to Project Settings → Environment Variables
2. Add these variables:

```env
# Database
DB_URL=mongodb+srv://user:pass@cluster.mongodb.net/realEstate
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/realEstate

# Redis (or set REDIS_ENABLED=false)
REDIS_ENABLED=true
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Authentication
JWT_SECRET=your-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.vercel.app

# Domain
DOMAIN=https://your-domain.vercel.app

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Client Config
NEXT_PUBLIC_CLIENT_ID=your-client-id
NEXT_PUBLIC_AUTHENTICATION_CODE=your-auth-code
```

#### 4. Deploy
```bash
# Vercel
vercel --prod

# Railway
railway up

# Or push to GitHub and connect to your platform
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_URL` | MongoDB connection string | `mongodb://...` |
| `MONGODB_URI` | Same as DB_URL (for compatibility) | `mongodb://...` |
| `JWT_SECRET` | Secret for JWT tokens | Random string |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_ENABLED` | Enable/disable Redis | `false` |
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `SALT_ID` | Password hashing rounds | `10` |

---

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongooseError: The 'uri' parameter to 'openUri()' must be a string, got "undefined"`

**Solution**: Ensure both `DB_URL` and `MONGODB_URI` are set in your environment.

### Redis Connection Errors

**Error**: `ECONNREFUSED` or Redis timeout

**Solution**: 
- For local development: Set `REDIS_ENABLED=false`
- For production: Verify Redis credentials and host

### Port Already in Use

**Error**: `Port 3000 is already allocated`

**Solution**: 
```bash
# Stop the conflicting service or change port in docker-compose.yml
ports:
  - '3001:3000'
```

### Container Won't Start

```bash
# Check logs
docker-compose logs web

# Restart with fresh build
docker-compose down
docker-compose up -d --build
```

---

## Migration Between Deployments

### From Cloud to Docker

1. Export data from MongoDB Atlas:
```bash
mongodump --uri="mongodb+srv://..." --out=./backup
```

2. Start Docker containers:
```bash
docker-compose up -d
```

3. Import data:
```bash
docker-compose exec mongodb mongorestore --username admin --password yourpass /data/backup
```

### From Docker to Cloud

1. Export from Docker:
```bash
docker-compose exec mongodb mongodump --out /data/backup
docker cp real-estate-mongodb:/data/backup ./backup
```

2. Import to Atlas:
```bash
mongorestore --uri="mongodb+srv://..." ./backup
```

---

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use strong passwords** - Minimum 16 characters
3. **Rotate secrets regularly** - Especially JWT and NextAuth secrets
4. **Enable firewall rules** - Restrict database access
5. **Use HTTPS in production** - Set up SSL/TLS
6. **Monitor logs** - Check for suspicious activity

---

## Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Review this guide
3. Check the [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for Docker-specific help
