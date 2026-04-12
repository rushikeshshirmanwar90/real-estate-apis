# Separate MongoDB Server Deployment Guide

This guide explains how to deploy MongoDB on a separate server from your application.

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION SERVER                       │
│  (Server 1 - e.g., 192.168.1.10)                           │
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │    Redis     │         │   Web App    │                │
│  │  Container   │◄────────┤  Container   │                │
│  └──────────────┘         └──────┬───────┘                │
│                                   │                         │
└───────────────────────────────────┼─────────────────────────┘
                                    │
                                    │ MongoDB Connection
                                    │ Port 27017
                                    │
┌───────────────────────────────────▼─────────────────────────┐
│                    DATABASE SERVER                          │
│  (Server 2 - e.g., 192.168.1.20)                           │
│                                                             │
│  ┌──────────────────────────────────────┐                  │
│  │         MongoDB Container            │                  │
│  │  Port: 27017                         │                  │
│  │  Data: /data/db (persistent)         │                  │
│  └──────────────────────────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Steps

### Server 1: MongoDB Server Setup

#### Step 1: Prepare the Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

#### Step 2: Setup MongoDB

```bash
# Create directory for MongoDB
mkdir -p ~/mongodb-server
cd ~/mongodb-server

# Copy the MongoDB docker-compose file
# (Transfer docker-compose.mongodb.yml to this server)

# Create environment file
cp .env.mongodb-server .env

# Edit environment file
nano .env
```

Edit `.env`:
```bash
MONGO_USERNAME=admin
MONGO_PASSWORD=YourVerySecurePassword123!
```

#### Step 3: Configure Firewall

```bash
# Allow MongoDB port from your app server IP only
sudo ufw allow from <app-server-ip> to any port 27017

# Example:
sudo ufw allow from 192.168.1.10 to any port 27017

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

#### Step 4: Start MongoDB

```bash
# Start MongoDB container
docker-compose -f docker-compose.mongodb.yml up -d

# Check status
docker-compose -f docker-compose.mongodb.yml ps

# View logs
docker-compose -f docker-compose.mongodb.yml logs -f mongodb
```

#### Step 5: Verify MongoDB is Running

```bash
# Test MongoDB connection
docker exec -it real-estate-mongodb mongosh -u admin -p YourVerySecurePassword123! --authenticationDatabase admin

# Inside mongosh:
> db.adminCommand('ping')
> show dbs
> exit
```

#### Step 6: Get Server IP Address

```bash
# Get IP address
ip addr show

# Or for public IP
curl ifconfig.me
```

Note this IP address - you'll need it for the app server.

---

### Server 2: Application Server Setup

#### Step 1: Prepare the Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y
```

#### Step 2: Setup Application

```bash
# Create directory
mkdir -p ~/real-estate-app
cd ~/real-estate-app

# Copy application files
# (Transfer docker-compose.yml and .env.app-server)

# Create environment file
cp .env.app-server .env

# Edit environment file
nano .env
```

Edit `.env` and update MongoDB connection:
```bash
# Replace <mongodb-server-ip> with actual IP from Server 1
DB_URL=mongodb://admin:YourVerySecurePassword123!@192.168.1.20:27017/realEstate?authSource=admin
MONGODB_URI=mongodb://admin:YourVerySecurePassword123!@192.168.1.20:27017/realEstate?authSource=admin

# Update other variables as needed
REDIS_PASSWORD=SecureRedisPassword123!
JWT_SECRET=your-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret
# ... etc
```

#### Step 3: Test MongoDB Connection

```bash
# Install MongoDB client tools (optional)
sudo apt install mongodb-clients -y

# Test connection to MongoDB server
mongosh "mongodb://admin:YourVerySecurePassword123!@192.168.1.20:27017/realEstate?authSource=admin"

# If successful, you should see MongoDB shell
```

#### Step 4: Start Application

```bash
# Start application and Redis
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f web
```

#### Step 5: Verify Application

```bash
# Check if app is running
curl http://localhost:3000

# Check MongoDB connection from app
docker-compose exec web env | grep MONGODB_URI
```

---

## 🔒 Security Configuration

### MongoDB Server Security

#### 1. Firewall Rules

```bash
# On MongoDB server, allow only app server
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow from <app-server-ip> to any port 27017
sudo ufw enable
```

#### 2. MongoDB Authentication

Already configured in docker-compose.mongodb.yml:
- Admin user with password
- Authentication required
- authSource=admin

#### 3. Network Isolation (Optional)

For cloud deployments, use VPC/Private Network:
- Place both servers in same private network
- Don't expose MongoDB to public internet
- Use private IPs for communication

---

## 🧪 Testing

### Test 1: MongoDB Server Accessibility

From application server:
```bash
# Test connection
nc -zv <mongodb-server-ip> 27017

# Should output: Connection succeeded
```

### Test 2: MongoDB Authentication

```bash
# From app server
mongosh "mongodb://admin:password@<mongodb-server-ip>:27017/realEstate?authSource=admin"

# Run test query
> db.adminCommand('ping')
> show dbs
```

### Test 3: Application Connection

```bash
# Check app logs for MongoDB connection
docker-compose logs web | grep -i mongo

# Should see: "MongoDB connected successfully"
```

### Test 4: End-to-End Test

```bash
# Test API endpoint
curl http://<app-server-ip>:3000/api/health

# Or test from browser
http://<app-server-ip>:3000
```

---

## 📊 Monitoring

### MongoDB Server Monitoring

```bash
# Check MongoDB status
docker-compose -f docker-compose.mongodb.yml ps

# View MongoDB logs
docker-compose -f docker-compose.mongodb.yml logs -f mongodb

# Check MongoDB stats
docker exec -it real-estate-mongodb mongosh -u admin -p password --eval "db.serverStatus()"

# Check disk usage
docker exec -it real-estate-mongodb du -sh /data/db
```

### Application Server Monitoring

```bash
# Check app status
docker-compose ps

# View app logs
docker-compose logs -f web

# Check Redis status
docker-compose exec redis redis-cli -a password ping
```

---

## 💾 Backup & Restore

### Backup MongoDB (from MongoDB server)

```bash
# Create backup directory
mkdir -p ~/mongodb-backups

# Backup database
docker exec real-estate-mongodb mongodump \
  --username admin \
  --password YourPassword \
  --authenticationDatabase admin \
  --out /data/backup

# Copy backup to host
docker cp real-estate-mongodb:/data/backup ~/mongodb-backups/backup-$(date +%Y%m%d)

# Compress backup
cd ~/mongodb-backups
tar -czf backup-$(date +%Y%m%d).tar.gz backup-$(date +%Y%m%d)
```

### Restore MongoDB

```bash
# Copy backup to container
docker cp ~/mongodb-backups/backup-20260411 real-estate-mongodb:/data/restore

# Restore database
docker exec real-estate-mongodb mongorestore \
  --username admin \
  --password YourPassword \
  --authenticationDatabase admin \
  /data/restore
```

### Automated Backup Script

Create `backup-mongodb.sh`:
```bash
#!/bin/bash
BACKUP_DIR=~/mongodb-backups
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
docker exec real-estate-mongodb mongodump \
  --username admin \
  --password YourPassword \
  --authenticationDatabase admin \
  --out /data/backup-$DATE

# Copy to host
docker cp real-estate-mongodb:/data/backup-$DATE $BACKUP_DIR/

# Compress
tar -czf $BACKUP_DIR/backup-$DATE.tar.gz -C $BACKUP_DIR backup-$DATE

# Remove uncompressed backup
rm -rf $BACKUP_DIR/backup-$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/backup-$DATE.tar.gz"
```

Setup cron job:
```bash
# Make script executable
chmod +x backup-mongodb.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/user/backup-mongodb.sh >> /home/user/backup.log 2>&1
```

---

## 🔧 Troubleshooting

### Issue 1: Cannot Connect to MongoDB

**Symptoms:**
- App shows "MongoDB connection error"
- Connection timeout

**Solutions:**
```bash
# 1. Check MongoDB is running
docker ps | grep mongodb

# 2. Check firewall
sudo ufw status

# 3. Test connection from app server
nc -zv <mongodb-server-ip> 27017

# 4. Check MongoDB logs
docker logs real-estate-mongodb

# 5. Verify credentials
docker exec -it real-estate-mongodb mongosh -u admin -p password
```

### Issue 2: Authentication Failed

**Symptoms:**
- "Authentication failed" error

**Solutions:**
```bash
# 1. Verify credentials in .env match MongoDB server
grep MONGO .env

# 2. Check MongoDB users
docker exec -it real-estate-mongodb mongosh -u admin -p password --eval "db.getUsers()"

# 3. Reset password if needed
docker exec -it real-estate-mongodb mongosh -u admin -p oldpassword
> use admin
> db.changeUserPassword("admin", "newpassword")
```

### Issue 3: Slow Performance

**Solutions:**
```bash
# 1. Check MongoDB stats
docker exec -it real-estate-mongodb mongosh -u admin -p password --eval "db.serverStatus()"

# 2. Check disk space
df -h

# 3. Check network latency
ping <mongodb-server-ip>

# 4. Add indexes (if needed)
# Connect to MongoDB and create indexes on frequently queried fields
```

---

## 📋 Maintenance Checklist

### Daily
- [ ] Check service status
- [ ] Review logs for errors
- [ ] Monitor disk space

### Weekly
- [ ] Verify backups are running
- [ ] Test backup restore
- [ ] Review performance metrics

### Monthly
- [ ] Update Docker images
- [ ] Review security settings
- [ ] Clean up old backups
- [ ] Review and optimize database indexes

---

## 🌐 Cloud Deployment Examples

### AWS (EC2)

**MongoDB Server:**
- Instance: t3.medium (2 vCPU, 4 GB RAM)
- Storage: 100 GB EBS volume
- Security Group: Allow port 27017 from app server security group

**App Server:**
- Instance: t3.small (2 vCPU, 2 GB RAM)
- Security Group: Allow port 3000 from internet, allow outbound to MongoDB

### DigitalOcean

**MongoDB Droplet:**
- Size: 2 GB RAM, 1 vCPU
- Add to VPC
- Private IP: Use for MongoDB connection

**App Droplet:**
- Size: 2 GB RAM, 1 vCPU
- Same VPC as MongoDB
- Use private IP for MongoDB connection

### Google Cloud (GCE)

**MongoDB VM:**
- Machine type: e2-medium
- Boot disk: 100 GB
- Network tags: mongodb-server

**App VM:**
- Machine type: e2-small
- Firewall rule: Allow from app to mongodb-server:27017

---

## 📞 Quick Commands Reference

```bash
# MongoDB Server
docker-compose -f docker-compose.mongodb.yml up -d    # Start
docker-compose -f docker-compose.mongodb.yml down     # Stop
docker-compose -f docker-compose.mongodb.yml logs -f  # Logs
docker exec -it real-estate-mongodb mongosh           # Shell

# Application Server
docker-compose up -d                                  # Start
docker-compose down                                   # Stop
docker-compose logs -f web                            # Logs
docker-compose restart web                            # Restart app

# Testing
nc -zv <mongodb-ip> 27017                            # Test connection
mongosh "mongodb://user:pass@ip:27017/db"            # Connect
```

---

## ✅ Deployment Checklist

### MongoDB Server
- [ ] Docker installed
- [ ] docker-compose.mongodb.yml copied
- [ ] .env file configured with strong password
- [ ] Firewall configured (allow app server IP only)
- [ ] MongoDB container started
- [ ] MongoDB accessible from app server
- [ ] Backup script configured

### Application Server
- [ ] Docker installed
- [ ] docker-compose.yml copied
- [ ] .env file configured with MongoDB server IP
- [ ] All environment variables set
- [ ] Containers started (web + redis)
- [ ] Application accessible
- [ ] MongoDB connection verified
- [ ] Monitoring configured

---

## 🎉 Success!

Once both servers are running and connected, you should see:
- MongoDB running on dedicated server
- Application connecting to remote MongoDB
- All services healthy and operational

Your architecture is now more scalable and maintainable!
