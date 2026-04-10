# Environment Files - Quick Reference

## 🎯 One-Page Cheat Sheet

### Which File Does What?

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENVIRONMENT FILES                            │
└─────────────────────────────────────────────────────────────────┘

📄 .env                          ← 🟢 ACTIVE FILE (used by everything)
   ├─ Read by: Docker, Local Dev, Production
   ├─ Gitignored: YES
   └─ Action: EDIT THIS FILE with your actual values

📄 .env.docker                   ← 📦 TEMPLATE (copy to .env)
   ├─ Read by: Nothing (it's a template)
   ├─ Gitignored: NO
   └─ Action: cp .env.docker .env (then edit .env)

📄 .env.local.example            ← 💻 TEMPLATE (copy to .env.local)
   ├─ Read by: Nothing (it's a template)
   ├─ Gitignored: NO
   └─ Action: cp .env.local.example .env.local

📄 .env.production               ← 🚀 TEMPLATE (for production)
   ├─ Read by: Next.js in production mode
   ├─ Gitignored: YES
   └─ Action: Use for production reference

📄 .env.local                    ← 💻 LOCAL OVERRIDES (optional)
   ├─ Read by: Next.js (overrides .env)
   ├─ Gitignored: YES
   └─ Action: Create for local development only
```

---

## 🐳 Docker Container Variable Flow

```
┌──────────────┐
│   .env file  │  ← YOU EDIT THIS
└──────┬───────┘
       │
       │ docker-compose.yml reads this
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                    docker-compose.yml                    │
│  Reads variables and distributes to containers:          │
└──────────────────────────────────────────────────────────┘
       │
       ├─────────────────┬─────────────────┬───────────────┐
       ▼                 ▼                 ▼               ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐
│  MongoDB    │   │   Redis     │   │   Web App           │
│  Container  │   │  Container  │   │   Container         │
├─────────────┤   ├─────────────┤   ├─────────────────────┤
│ Receives:   │   │ Receives:   │   │ Receives:           │
│             │   │             │   │                     │
│ MONGO_      │   │ REDIS_      │   │ DB_URL              │
│ USERNAME    │   │ PASSWORD    │   │ MONGODB_URI         │
│             │   │             │   │ JWT_SECRET          │
│ MONGO_      │   │             │   │ NEXTAUTH_SECRET     │
│ PASSWORD    │   │             │   │ SMTP_*              │
│             │   │             │   │ REDIS_HOST=redis    │
│             │   │             │   │ REDIS_PORT=6379     │
│             │   │             │   │ ... all other vars  │
└─────────────┘   └─────────────┘   └─────────────────────┘
```

---

## 🚀 Deployment Workflows

### Docker Deployment

```bash
# 1. Setup
cp .env.docker .env

# 2. Edit (add your passwords)
nano .env

# 3. Deploy
docker-compose up -d

# Variables flow:
# .env → docker-compose.yml → containers
```

### Local Development

```bash
# 1. Setup
cp .env.local.example .env.local

# 2. Edit (add your MongoDB Atlas URL)
nano .env.local

# 3. Run
npm run dev

# Variables flow:
# .env.local → Next.js → Your app
# (falls back to .env if variable not in .env.local)
```

### Cloud Deployment (Vercel/Railway)

```bash
# Don't use .env files!
# Set variables in platform dashboard:

Vercel:
  Settings → Environment Variables → Add each variable

Railway:
  Variables tab → Add each variable

# Variables flow:
# Platform dashboard → Your deployed app
```

---

## 📊 Variable Distribution Table

| Variable | MongoDB Container | Redis Container | Web Container |
|----------|-------------------|-----------------|---------------|
| `MONGO_USERNAME` | ✅ Used | ❌ | ❌ (but used to build DB_URL) |
| `MONGO_PASSWORD` | ✅ Used | ❌ | ❌ (but used to build DB_URL) |
| `REDIS_PASSWORD` | ❌ | ✅ Used | ✅ Used |
| `DB_URL` | ❌ | ❌ | ✅ Used |
| `MONGODB_URI` | ❌ | ❌ | ✅ Used |
| `JWT_SECRET` | ❌ | ❌ | ✅ Used |
| `NEXTAUTH_SECRET` | ❌ | ❌ | ✅ Used |
| `SMTP_*` | ❌ | ❌ | ✅ Used |

---

## 🔧 Common Commands

### Check what variables a container sees:

```bash
# Web container
docker-compose exec web env

# MongoDB container
docker-compose exec mongodb env

# Redis container
docker-compose exec redis env
```

### Restart after changing .env:

```bash
# Restart specific container
docker-compose restart web

# Restart all containers
docker-compose restart

# Recreate containers (if structure changed)
docker-compose up -d --force-recreate
```

### Verify .env is loaded:

```bash
# Check if .env exists
ls -la .env

# View contents (be careful with passwords!)
cat .env

# Check specific variable
grep MONGODB_URI .env
```

---

## ⚡ Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "MONGODB_URI is undefined" | Add `MONGODB_URI=...` to `.env` file |
| Changes not taking effect | Restart: `docker-compose restart web` |
| Which file is active? | Always `.env` (or `.env.local` for local dev) |
| Template files not working | Templates must be copied to `.env` first |
| Variables not in container | Check `docker-compose exec web env` |

---

## 💡 Remember

1. **`.env`** is the ONLY file that matters for Docker
2. Templates (`.env.docker`, `.env.local.example`) must be copied to `.env` or `.env.local`
3. Always restart containers after editing `.env`
4. Cloud platforms don't use `.env` files - use their dashboard
5. Never commit `.env` to git (it's in `.gitignore`)

---

## 📖 Full Documentation

For detailed explanations, see:
- [ENV_FILES_GUIDE.md](./ENV_FILES_GUIDE.md) - Complete guide
- [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) - Docker-specific help
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - General setup instructions
