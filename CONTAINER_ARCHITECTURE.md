# Container Architecture & Environment Variables

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DOCKER HOST MACHINE                            │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                         .env FILE                                 │ │
│  │  (YOU EDIT THIS - copied from .env.docker template)              │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │  MONGO_USERNAME=admin                                             │ │
│  │  MONGO_PASSWORD=SecurePassword123                                 │ │
│  │  REDIS_PASSWORD=RedisPass123                                      │ │
│  │  JWT_SECRET=your-secret                                           │ │
│  │  NEXTAUTH_SECRET=your-nextauth-secret                             │ │
│  │  SMTP_HOST=smtp.gmail.com                                         │ │
│  │  ... (all other variables)                                        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                  │                                      │
│                                  │ Read by docker-compose.yml           │
│                                  ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    docker-compose.yml                             │ │
│  │  - Reads .env file                                                │ │
│  │  - Substitutes ${VARIABLE_NAME} with actual values                │ │
│  │  - Passes variables to containers                                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                  │                                      │
│         ┌────────────────────────┼────────────────────────┐            │
│         │                        │                        │            │
│         ▼                        ▼                        ▼            │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────────┐ │
│  │  MongoDB    │         │   Redis     │         │   Web App       │ │
│  │  Container  │         │  Container  │         │   Container     │ │
│  │             │         │             │         │   (Next.js)     │ │
│  │ Port: 27017 │◄────────┤ Port: 6379  │◄────────┤   Port: 3000    │ │
│  │             │         │ Port: 8001  │         │                 │ │
│  └─────────────┘         └─────────────┘         └─────────────────┘ │
│       │                        │                         │            │
│       │                        │                         │            │
│       ▼                        ▼                         ▼            │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────────┐ │
│  │ Volume:     │         │ Volume:     │         │ Connects to:    │ │
│  │ mongodb-    │         │ redis-data  │         │ - mongodb:27017 │ │
│  │ data        │         │             │         │ - redis:6379    │ │
│  └─────────────┘         └─────────────┘         └─────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
         │                        │                         │
         │                        │                         │
         ▼                        ▼                         ▼
    localhost:27017         localhost:6379           localhost:3000
    (MongoDB access)        (Redis access)           (Your app)
                            localhost:8001
                            (RedisInsight UI)
```

---

## 🔄 Environment Variable Flow

### Step-by-Step Process

```
STEP 1: You create/edit .env file
┌─────────────────────────────────────┐
│ $ cp .env.docker .env               │
│ $ nano .env                         │
│                                     │
│ MONGO_USERNAME=admin                │
│ MONGO_PASSWORD=mypass               │
│ REDIS_PASSWORD=redispass            │
└─────────────────────────────────────┘
                 │
                 │
                 ▼
STEP 2: docker-compose.yml reads .env
┌─────────────────────────────────────┐
│ $ docker-compose up -d              │
│                                     │
│ docker-compose.yml:                 │
│   MONGO_INITDB_ROOT_USERNAME:       │
│     ${MONGO_USERNAME:-admin}        │
│   ↓                                 │
│   Becomes: admin                    │
└─────────────────────────────────────┘
                 │
                 │
                 ▼
STEP 3: Variables passed to containers
┌─────────────────────────────────────┐
│ MongoDB Container receives:         │
│   MONGO_INITDB_ROOT_USERNAME=admin  │
│   MONGO_INITDB_ROOT_PASSWORD=mypass │
│                                     │
│ Redis Container receives:           │
│   REDIS_ARGS=--requirepass redispass│
│                                     │
│ Web Container receives:             │
│   DB_URL=mongodb://admin:mypass@... │
│   MONGODB_URI=mongodb://admin:...   │
│   REDIS_PASSWORD=redispass          │
│   ... (all other app variables)    │
└─────────────────────────────────────┘
```

---

## 📦 Container Details

### MongoDB Container

```
┌─────────────────────────────────────────────────────────┐
│ Container Name: real-estate-mongodb                     │
│ Image: mongo:7.0                                        │
│ Port Mapping: 27017:27017                               │
├─────────────────────────────────────────────────────────┤
│ RECEIVES FROM .env:                                     │
│   ✓ MONGO_USERNAME                                      │
│   ✓ MONGO_PASSWORD                                      │
├─────────────────────────────────────────────────────────┤
│ WHAT IT DOES:                                           │
│   - Creates admin user with MONGO_USERNAME              │
│   - Sets password to MONGO_PASSWORD                     │
│   - Initializes "realEstate" database                   │
│   - Stores data in mongodb-data volume                  │
├─────────────────────────────────────────────────────────┤
│ ACCESS:                                                 │
│   From host: localhost:27017                            │
│   From containers: mongodb:27017                        │
│   Shell: docker-compose exec mongodb mongosh            │
└─────────────────────────────────────────────────────────┘
```

### Redis Container

```
┌─────────────────────────────────────────────────────────┐
│ Container Name: (auto-generated)                        │
│ Image: redis/redis-stack:latest                         │
│ Port Mapping: 6379:6379, 8001:8001                      │
├─────────────────────────────────────────────────────────┤
│ RECEIVES FROM .env:                                     │
│   ✓ REDIS_PASSWORD                                      │
├─────────────────────────────────────────────────────────┤
│ WHAT IT DOES:                                           │
│   - Starts Redis server with password protection       │
│   - Starts RedisInsight UI on port 8001                 │
│   - Stores data in redis-data volume                    │
├─────────────────────────────────────────────────────────┤
│ ACCESS:                                                 │
│   Redis: localhost:6379                                 │
│   RedisInsight UI: http://localhost:8001                │
│   From containers: redis:6379                           │
│   CLI: docker-compose exec redis redis-cli -a password  │
└─────────────────────────────────────────────────────────┘
```

### Web Application Container

```
┌─────────────────────────────────────────────────────────┐
│ Container Name: (auto-generated)                        │
│ Image: exponentor/xsite-apis:latest                     │
│ Port Mapping: 3000:3000                                 │
├─────────────────────────────────────────────────────────┤
│ RECEIVES FROM .env:                                     │
│   ✓ MONGO_USERNAME (used to build DB_URL)              │
│   ✓ MONGO_PASSWORD (used to build DB_URL)              │
│   ✓ REDIS_PASSWORD                                      │
│   ✓ JWT_SECRET                                          │
│   ✓ SALT_ID                                             │
│   ✓ NEXTAUTH_SECRET                                     │
│   ✓ NEXTAUTH_URL                                        │
│   ✓ DOMAIN                                              │
│   ✓ SMTP_HOST, SMTP_PORT, SMTP_SECURE                   │
│   ✓ SMTP_USER, SMTP_PASS                                │
│   ✓ NEXT_PUBLIC_CLIENT_ID                               │
│   ✓ NEXT_PUBLIC_AUTHENTICATION_CODE                     │
├─────────────────────────────────────────────────────────┤
│ AUTO-SET VARIABLES:                                     │
│   • NODE_ENV=production                                 │
│   • REDIS_HOST=redis (container name)                   │
│   • REDIS_PORT=6379                                     │
│   • DB_URL=mongodb://user:pass@mongodb:27017/realEstate │
│   • MONGODB_URI=mongodb://user:pass@mongodb:27017/...   │
├─────────────────────────────────────────────────────────┤
│ WHAT IT DOES:                                           │
│   - Runs your Next.js application                       │
│   - Connects to mongodb container                       │
│   - Connects to redis container                         │
│   - Serves your app on port 3000                        │
├─────────────────────────────────────────────────────────┤
│ DEPENDS ON:                                             │
│   - MongoDB (waits for health check)                    │
│   - Redis (waits for health check)                      │
├─────────────────────────────────────────────────────────┤
│ ACCESS:                                                 │
│   Application: http://localhost:3000                    │
│   Logs: docker-compose logs -f web                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔗 Container Networking

Containers communicate using Docker's internal network:

```
┌─────────────────────────────────────────────────────────┐
│              Docker Internal Network                    │
│                                                         │
│  mongodb:27017 ◄──────────┐                            │
│       ▲                    │                            │
│       │                    │                            │
│       │ Connects to        │ Connects to                │
│       │                    │                            │
│  web:3000 ─────────────────┴──────────► redis:6379     │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                                      │
         │ Exposed to host                     │
         ▼                                      ▼
   localhost:3000                        localhost:6379
                                         localhost:8001
```

**Key Points:**
- Containers use service names as hostnames (e.g., `mongodb`, `redis`)
- Web container connects to `mongodb:27017` (not `localhost:27017`)
- From your host machine, use `localhost:27017`, `localhost:6379`, etc.

---

## 💾 Data Persistence

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Volumes                       │
│                                                         │
│  mongodb-data                                           │
│  ├─ /data/db (MongoDB database files)                  │
│  └─ Persists even when container is removed            │
│                                                         │
│  mongodb-config                                         │
│  ├─ /data/configdb (MongoDB config files)              │
│  └─ Persists even when container is removed            │
│                                                         │
│  redis-data                                             │
│  ├─ /data (Redis data files)                           │
│  └─ Persists even when container is removed            │
│                                                         │
└─────────────────────────────────────────────────────────┘

Commands:
  List volumes:    docker volume ls
  Inspect volume:  docker volume inspect mongodb-data
  Remove volumes:  docker-compose down -v (⚠️ deletes data!)
```

---

## 🚀 Startup Sequence

```
1. docker-compose up -d
   │
   ├─► Start MongoDB container
   │   └─► Wait for health check (mongosh ping)
   │       └─► Status: healthy ✓
   │
   ├─► Start Redis container
   │   └─► Wait for health check (redis-cli ping)
   │       └─► Status: healthy ✓
   │
   └─► Start Web container
       └─► Waits for MongoDB and Redis to be healthy
           └─► Connects to mongodb:27017
           └─► Connects to redis:6379
           └─► Application starts ✓
```

---

## 🔍 Debugging Commands

```bash
# Check which variables a container sees
docker-compose exec web env | grep -E "MONGO|REDIS|DB"

# Check MongoDB connection from web container
docker-compose exec web sh -c 'echo $DB_URL'

# Test MongoDB connection
docker-compose exec mongodb mongosh \
  -u admin -p yourpassword --eval "db.adminCommand('ping')"

# Test Redis connection
docker-compose exec redis redis-cli -a yourpassword ping

# View all container environment variables
docker-compose exec web env
docker-compose exec mongodb env
docker-compose exec redis env
```

---

## 📊 Variable Distribution Matrix

| Variable | .env File | MongoDB | Redis | Web | Purpose |
|----------|-----------|---------|-------|-----|---------|
| MONGO_USERNAME | ✓ | ✓ | ✗ | ✗* | MongoDB admin user |
| MONGO_PASSWORD | ✓ | ✓ | ✗ | ✗* | MongoDB admin password |
| REDIS_PASSWORD | ✓ | ✗ | ✓ | ✓ | Redis password |
| DB_URL | ✗** | ✗ | ✗ | ✓ | MongoDB connection string |
| MONGODB_URI | ✗** | ✗ | ✗ | ✓ | MongoDB connection string |
| JWT_SECRET | ✓ | ✗ | ✗ | ✓ | JWT signing secret |
| NEXTAUTH_SECRET | ✓ | ✗ | ✗ | ✓ | NextAuth secret |
| SMTP_* | ✓ | ✗ | ✗ | ✓ | Email configuration |

\* Used to construct DB_URL and MONGODB_URI  
\** Auto-constructed by docker-compose.yml

---

## 🎯 Summary

1. **One .env file** controls everything
2. **docker-compose.yml** reads .env and distributes variables
3. **Each container** receives only what it needs
4. **Web container** gets the most variables (app configuration)
5. **MongoDB and Redis** get minimal configuration (just credentials)
6. **Data persists** in Docker volumes
7. **Containers communicate** using service names (mongodb, redis)
8. **Host access** uses localhost (localhost:3000, localhost:27017)
