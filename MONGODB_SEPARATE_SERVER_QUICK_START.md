# MongoDB Separate Server - Quick Start

## 🎯 Overview

You now have TWO docker-compose files:

1. **docker-compose.yml** - For Application Server (Web + Redis)
2. **docker-compose.mongodb.yml** - For MongoDB Server (Database only)

---

## 📦 Files Created

```
real-estate-apis/
├── docker-compose.yml              # App server (Web + Redis)
├── docker-compose.mongodb.yml      # MongoDB server
├── .env.app-server                 # Template for app server
├── .env.mongodb-server             # Template for MongoDB server
├── mongodb-start.sh                # MongoDB server start script
└── SEPARATE_MONGODB_DEPLOYMENT.md  # Complete guide
```

---

## 🚀 Quick Deployment

### Server 1: MongoDB Server

```bash
# 1. Copy files to MongoDB server
scp docker-compose.mongodb.yml user@mongodb-server:~/
scp .env.mongodb-server user@mongodb-server:~/

# 2. SSH to MongoDB server
ssh user@mongodb-server

# 3. Setup
cp .env.mongodb-server .env
nano .env  # Change password!

# 4. Start MongoDB
docker-compose -f docker-compose.mongodb.yml up -d

# 5. Get server IP
hostname -I

# Note this IP for app server!
```

### Server 2: Application Server

```bash
# 1. Copy files to app server
scp docker-compose.yml user@app-server:~/
scp .env.app-server user@app-server:~/

# 2. SSH to app server
ssh user@app-server

# 3. Setup
cp .env.app-server .env
nano .env  # Update MongoDB IP!

# Edit these lines:
DB_URL=mongodb://admin:password@<MONGODB-SERVER-IP>:27017/realEstate?authSource=admin
MONGODB_URI=mongodb://admin:password@<MONGODB-SERVER-IP>:27017/realEstate?authSource=admin

# 4. Start application
docker-compose up -d
```

---

## 🔐 Security Setup

### On MongoDB Server:

```bash
# Allow only app server IP
sudo ufw allow from <APP-SERVER-IP> to any port 27017
sudo ufw enable
```

### On App Server:

```bash
# Allow web traffic
sudo ufw allow 3000
sudo ufw enable
```

---

## 🧪 Testing

### Test 1: MongoDB Accessibility

From app server:
```bash
nc -zv <MONGODB-SERVER-IP> 27017
# Should show: Connection succeeded
```

### Test 2: MongoDB Authentication

From app server:
```bash
mongosh "mongodb://admin:password@<MONGODB-SERVER-IP>:27017/realEstate?authSource=admin"
```

### Test 3: Application

```bash
# Check app logs
docker-compose logs web | grep -i mongo

# Should see: "MongoDB connected successfully"
```

---

## 📋 Connection String Format

```
mongodb://USERNAME:PASSWORD@MONGODB-SERVER-IP:27017/DATABASE?authSource=admin
```

**Example:**
```
mongodb://admin:SecurePass123@192.168.1.20:27017/realEstate?authSource=admin
```

**Components:**
- `admin` - MongoDB username
- `SecurePass123` - MongoDB password
- `192.168.1.20` - MongoDB server IP
- `27017` - MongoDB port
- `realEstate` - Database name
- `authSource=admin` - Authentication database

---

## 🔧 Common Commands

### MongoDB Server

```bash
# Start
docker-compose -f docker-compose.mongodb.yml up -d

# Stop
docker-compose -f docker-compose.mongodb.yml down

# Logs
docker-compose -f docker-compose.mongodb.yml logs -f

# MongoDB shell
docker exec -it real-estate-mongodb mongosh -u admin -p password

# Backup
docker exec real-estate-mongodb mongodump --out /data/backup
```

### Application Server

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f web

# Restart app
docker-compose restart web

# Check environment
docker-compose exec web env | grep MONGODB
```

---

## 🗺️ Architecture

```
┌─────────────────────────┐
│   Application Server    │
│   (192.168.1.10)        │
│                         │
│  ┌─────────┐ ┌────────┐│
│  │  Redis  │ │  Web   ││
│  └─────────┘ └───┬────┘│
└──────────────────┼──────┘
                   │
                   │ Port 27017
                   │
┌──────────────────▼──────┐
│   MongoDB Server        │
│   (192.168.1.20)        │
│                         │
│  ┌──────────────────┐   │
│  │    MongoDB       │   │
│  │    Container     │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

---

## ⚠️ Important Notes

1. **Passwords**: Use the SAME password on both servers
2. **Firewall**: MongoDB server must allow app server IP
3. **IP Address**: Use the correct MongoDB server IP in app .env
4. **Testing**: Always test connection before deploying app
5. **Backups**: Set up automated backups on MongoDB server

---

## 📚 Full Documentation

For complete details, see:
- **SEPARATE_MONGODB_DEPLOYMENT.md** - Complete deployment guide
- **ENV_FILES_GUIDE.md** - Environment variables guide
- **DOCKER_DEPLOYMENT.md** - Docker operations

---

## ✅ Deployment Checklist

### MongoDB Server
- [ ] Docker installed
- [ ] docker-compose.mongodb.yml copied
- [ ] .env configured with strong password
- [ ] MongoDB started
- [ ] Firewall configured
- [ ] IP address noted

### Application Server
- [ ] Docker installed
- [ ] docker-compose.yml copied
- [ ] .env configured with MongoDB IP
- [ ] Connection tested
- [ ] Application started
- [ ] MongoDB connection verified

---

## 🆘 Troubleshooting

**Cannot connect to MongoDB:**
1. Check MongoDB is running: `docker ps`
2. Check firewall: `sudo ufw status`
3. Test connection: `nc -zv <mongodb-ip> 27017`
4. Check credentials match on both servers

**Authentication failed:**
1. Verify password is same on both servers
2. Check username is correct (default: admin)
3. Ensure authSource=admin in connection string

**App can't find MongoDB:**
1. Check DB_URL in app .env
2. Verify MongoDB server IP is correct
3. Restart app: `docker-compose restart web`

---

## 🎉 Success Indicators

✅ MongoDB server running on dedicated server  
✅ Application server connecting to remote MongoDB  
✅ No MongoDB container on application server  
✅ All services healthy  
✅ Application accessible  

Your MongoDB is now on a separate server!
