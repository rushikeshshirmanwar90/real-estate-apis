# Environment Files Guide

## 📋 Overview

This project has multiple `.env` files for different deployment scenarios. This guide explains which file is used when and how.

---

## 🗂️ All Environment Files

```
real-estate-apis/
├── .env                          # ⚠️ ACTIVE - Currently used (gitignored)
├── .env.docker                   # 📦 Template for Docker deployment
├── .env.local.example            # 💻 Template for local development
├── .env.production               # 🚀 Template for production deployment
└── .env.production.example       # 🚀 Another production template
```

---

## 🎯 Which File is Used When?

### 1. `.env` (ACTIVE FILE)
**Used by**: All environments (Docker, local dev, production)  
**Status**: ⚠️ This is the ONLY file that's actually read by your application  
**Gitignored**: ✅ Yes (never committed)

```bash
# This file is used by:
- Docker containers (via docker-compose.yml)
- Local development (npm run dev)
- Production builds (npm run build)
```

**How it works**:
- Next.js automatically loads `.env` file
- Docker Compose reads it and passes variables to containers
- This is your "active" configuration

---

### 2. `.env.docker` (TEMPLATE)
**Used by**: Docker deployments  
**Status**: 📦 Template file - NOT directly used  
**Gitignored**: ❌ No (safe to commit - no secrets)

**Purpose**: Template for Docker-specific configuration

**How to use**:
```bash
# When deploying with Docker:
cp .env.docker .env
# Then edit .env with your actual values
```

**Contains**:
- MongoDB container connection settings
- Redis container connection settings
- Docker-specific defaults

---

### 3. `.env.local.example` (TEMPLATE)
**Used by**: Local development  
**Status**: 💻 Template file - NOT directly used  
**Gitignored**: ❌ No (safe to commit - no secrets)

**Purpose**: Template for local development

**How to use**:
```bash
# For local development:
cp .env.local.example .env.local
# Then edit .env.local with your values
```

**Note**: Next.js loads files in this order:
1. `.env.local` (highest priority)
2. `.env.production` or `.env.development`
3. `.env` (lowest priority)

---

### 4. `.env.production` (TEMPLATE)
**Used by**: Production deployments  
**Status**: 🚀 Template file - NOT directly used  
**Gitignored**: ✅ Yes (contains some values)

**Purpose**: Template for production configuration

**How to use**:
```bash
# For production:
cp .env.production .env
# Or set variables directly in your hosting platform
```

---

## 🐳 Docker Container Environment Flow

### How Docker Uses Environment Variables:

```
┌─────────────────────────────────────────────────────────┐
│  1. You create/edit .env file                           │
│     (from .env.docker template)                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  2. docker-compose.yml reads .env file                  │
│     - Loads variables like ${MONGO_USERNAME}            │
│     - Substitutes them in the config                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  3. Variables passed to containers                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   MongoDB    │  │    Redis     │  │     Web      │ │
│  │  Container   │  │  Container   │  │  Container   │ │
│  │              │  │              │  │              │ │
│  │ Gets:        │  │ Gets:        │  │ Gets:        │ │
│  │ - MONGO_     │  │ - REDIS_     │  │ - DB_URL     │ │
│  │   USERNAME   │  │   PASSWORD   │  │ - MONGODB_   │ │
│  │ - MONGO_     │  │              │  │   URI        │ │
│  │   PASSWORD   │  │              │  │ - All app    │ │
│  │              │  │              │  │   variables  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Example from docker-compose.yml:

```yaml
services:
  mongodb:
    environment:
      # These come from .env file
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-adminpassword}
      
  web:
    environment:
      # These also come from .env file
      DB_URL: mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@mongodb:27017/realEstate
      MONGODB_URI: mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@mongodb:27017/realEstate
      JWT_SECRET: ${JWT_SECRET}
      # ... etc
```

---

## 📝 Quick Reference Table

| File | Used By | Purpose | Committed to Git? | Priority |
|------|---------|---------|-------------------|----------|
| `.env` | **ALL** | Active configuration | ❌ No | **ACTIVE** |
| `.env.local` | Local dev | Local overrides | ❌ No | Highest |
| `.env.development` | Local dev | Dev defaults | ✅ Yes | Medium |
| `.env.production` | Production | Prod defaults | ⚠️ Depends | Medium |
| `.env.docker` | Docker | Template only | ✅ Yes | N/A (template) |
| `.env.local.example` | Local dev | Template only | ✅ Yes | N/A (template) |
| `.env.production.example` | Production | Template only | ✅ Yes | N/A (template) |

---

## 🚀 Deployment Scenarios

### Scenario 1: Docker Deployment (Recommended)

```bash
# Step 1: Copy Docker template
cp .env.docker .env

# Step 2: Edit .env with your values
nano .env

# Step 3: Start Docker
docker-compose up -d

# What happens:
# - docker-compose.yml reads .env
# - Passes variables to all containers
# - MongoDB gets MONGO_USERNAME, MONGO_PASSWORD
# - Redis gets REDIS_PASSWORD
# - Web gets DB_URL, MONGODB_URI, and all app variables
```

**Which containers use which variables?**

```yaml
MongoDB Container:
  ✓ MONGO_USERNAME
  ✓ MONGO_PASSWORD

Redis Container:
  ✓ REDIS_PASSWORD

Web Container:
  ✓ DB_URL (built from MONGO_USERNAME + MONGO_PASSWORD)
  ✓ MONGODB_URI (built from MONGO_USERNAME + MONGO_PASSWORD)
  ✓ JWT_SECRET
  ✓ NEXTAUTH_SECRET
  ✓ SMTP_* variables
  ✓ All other app variables
```

---

### Scenario 2: Local Development (No Docker)

```bash
# Step 1: Copy local template
cp .env.local.example .env.local

# Step 2: Edit .env.local
nano .env.local

# Step 3: Run dev server
npm run dev

# What happens:
# - Next.js loads .env.local first
# - Falls back to .env if variable not in .env.local
# - Connects to MongoDB Atlas (cloud) or local MongoDB
```

---

### Scenario 3: Cloud Deployment (Vercel/Railway)

```bash
# Don't use .env files directly!
# Instead, set variables in platform dashboard

# Vercel:
# 1. Go to Project Settings → Environment Variables
# 2. Add each variable manually
# 3. Deploy

# Railway:
# 1. Go to Variables tab
# 2. Add each variable
# 3. Deploy
```

**Why?** Cloud platforms don't read `.env` files. They use their own environment variable system.

---

## 🔍 How to Check Which Variables Are Active

### In Docker:

```bash
# Check what the web container sees
docker-compose exec web env | grep -E "MONGO|REDIS|DB_URL"

# Check MongoDB container
docker-compose exec mongodb env | grep MONGO

# Check Redis container
docker-compose exec redis env | grep REDIS
```

### In Local Development:

```javascript
// Add this to any API route temporarily
console.log('DB_URL:', process.env.DB_URL);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('REDIS_ENABLED:', process.env.REDIS_ENABLED);
```

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Editing template files
```bash
# WRONG - This does nothing
nano .env.docker
docker-compose up -d
```

```bash
# CORRECT - Copy to .env first
cp .env.docker .env
nano .env
docker-compose up -d
```

### ❌ Mistake 2: Multiple .env files active
```bash
# Having both .env and .env.local can cause confusion
# Next.js will prioritize .env.local over .env
```

### ❌ Mistake 3: Forgetting to restart after changes
```bash
# After editing .env, you must restart:
docker-compose restart web

# Or reload the dev server:
# Ctrl+C and npm run dev again
```

---

## 🎓 Best Practices

1. **Never commit `.env`** - It's in `.gitignore` for a reason
2. **Use templates** - Keep `.env.docker` and `.env.local.example` updated
3. **Document changes** - If you add a new variable, update all templates
4. **Use strong passwords** - Especially for production
5. **Restart after changes** - Environment variables are loaded at startup

---

## 🆘 Troubleshooting

### Problem: "MONGODB_URI is undefined"
**Cause**: `.env` file doesn't have `MONGODB_URI` variable  
**Solution**: 
```bash
# Check if variable exists
cat .env | grep MONGODB_URI

# If missing, add it
echo "MONGODB_URI=your-connection-string" >> .env
```

### Problem: "Changes to .env not taking effect"
**Cause**: Containers/server not restarted  
**Solution**:
```bash
# For Docker:
docker-compose restart web

# For local dev:
# Stop (Ctrl+C) and restart: npm run dev
```

### Problem: "Which .env file is being used?"
**Solution**:
```bash
# Check file modification times
ls -la .env*

# The one being used is .env (or .env.local in local dev)
```

---

## 📚 Summary

**Simple Rule**: 
- **`.env`** = The ONLY file that matters (active configuration)
- **`.env.docker`** = Template for Docker (copy to `.env`)
- **`.env.local.example`** = Template for local dev (copy to `.env.local`)
- **`.env.production`** = Template for production (copy to `.env` or use platform variables)

**For Docker**: Copy `.env.docker` → `.env` → Edit → `docker-compose up -d`

**For Local Dev**: Copy `.env.local.example` → `.env.local` → Edit → `npm run dev`

**For Cloud**: Don't use files, set variables in platform dashboard
