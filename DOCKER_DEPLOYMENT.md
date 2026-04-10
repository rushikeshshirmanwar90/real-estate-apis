# Docker Deployment Guide

This guide explains how to deploy the Real Estate APIs application using Docker with MongoDB and Redis containers.

## Architecture

The Docker setup includes three services:
- **mongodb**: MongoDB database container
- **redis**: Redis cache and session storage
- **web**: Next.js application

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)

## Quick Start

### 1. Setup Environment Variables

Copy the Docker environment template:

```bash
cp .env.docker .env
```

Edit `.env` and update the following variables:
- `MONGO_USERNAME` and `MONGO_PASSWORD` (MongoDB credentials)
- `REDIS_PASSWORD` (Redis password)
- `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
- `SMTP_USER` and `SMTP_PASS` (your email credentials)
- `DOMAIN` and `NEXTAUTH_URL` (your production domain)

### 2. Start All Services

```bash
docker-compose up -d
```

This will:
- Pull the required images (MongoDB, Redis, your app)
- Create volumes for data persistence
- Start all containers
- Wait for health checks before starting the web app

### 3. Check Service Status

```bash
docker-compose ps
```

All services should show "healthy" status.

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f mongodb
docker-compose logs -f redis
```

## Service Details

### MongoDB Container

- **Port**: 27017 (mapped to host)
- **Database**: realEstate
- **Data Volume**: mongodb-data (persistent)
- **Connection String**: `mongodb://admin:password@mongodb:27017/realEstate?authSource=admin`

### Redis Container

- **Port**: 6379 (Redis), 8001 (RedisInsight UI)
- **Data Volume**: redis-data (persistent)
- **RedisInsight**: Access at http://localhost:8001

### Web Application

- **Port**: 3000
- **Depends on**: MongoDB and Redis (waits for health checks)

## Common Commands

### Stop All Services
```bash
docker-compose down
```

### Stop and Remove Volumes (⚠️ Deletes all data)
```bash
docker-compose down -v
```

### Restart a Specific Service
```bash
docker-compose restart web
```

### Rebuild and Restart
```bash
docker-compose up -d --build
```

### Access MongoDB Shell
```bash
docker-compose exec mongodb mongosh -u admin -p yourpassword --authenticationDatabase admin
```

### Access Redis CLI
```bash
docker-compose exec redis redis-cli -a yourpassword
```

## Data Persistence

Data is stored in Docker volumes:
- `mongodb-data`: MongoDB database files
- `mongodb-config`: MongoDB configuration
- `redis-data`: Redis data

These volumes persist even when containers are stopped or removed.

## Backup MongoDB Data

```bash
# Backup
docker-compose exec mongodb mongodump --username admin --password yourpassword --authenticationDatabase admin --out /data/backup

# Copy backup to host
docker cp real-estate-mongodb:/data/backup ./mongodb-backup

# Restore
docker-compose exec mongodb mongorestore --username admin --password yourpassword --authenticationDatabase admin /data/backup
```

## Troubleshooting

### MongoDB Connection Issues

Check if MongoDB is healthy:
```bash
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Redis Connection Issues

Check if Redis is responding:
```bash
docker-compose exec redis redis-cli -a yourpassword ping
```

### Application Not Starting

1. Check logs: `docker-compose logs web`
2. Verify environment variables are set correctly
3. Ensure MongoDB and Redis are healthy: `docker-compose ps`

### Port Conflicts

If ports 3000, 6379, 8001, or 27017 are already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - '3001:3000'  # Map to different host port
```

## Production Deployment

For production:

1. Use strong passwords for MongoDB and Redis
2. Set `NODE_ENV=production`
3. Use a reverse proxy (nginx) for SSL/TLS
4. Enable firewall rules to restrict database access
5. Set up automated backups
6. Monitor container health and logs

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| MONGO_USERNAME | MongoDB admin username | Yes |
| MONGO_PASSWORD | MongoDB admin password | Yes |
| REDIS_PASSWORD | Redis password | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| NEXTAUTH_SECRET | NextAuth.js secret | Yes |
| NEXTAUTH_URL | Application URL | Yes |
| DOMAIN | Public domain | Yes |
| SMTP_HOST | SMTP server host | Yes |
| SMTP_PORT | SMTP server port | Yes |
| SMTP_USER | SMTP username | Yes |
| SMTP_PASS | SMTP password | Yes |

## Monitoring

Access RedisInsight for Redis monitoring:
```
http://localhost:8001
```

Check container resource usage:
```bash
docker stats
```
