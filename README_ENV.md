# Environment Configuration - Start Here! 🚀

## 🤔 Confused About .env Files?

**Quick Answer**: Only `.env` matters. Everything else is a template.

```
.env          ← 🟢 THIS IS THE ONLY FILE THAT'S ACTUALLY USED
.env.docker   ← 📦 Template (copy to .env)
.env.local.example ← 💻 Template (copy to .env.local)
.env.production ← 🚀 Template (reference only)
```

---

## ⚡ Quick Start (Docker)

```bash
# 1. Copy template
cp .env.docker .env

# 2. Edit with your passwords
nano .env

# 3. Start everything
docker-compose up -d

# 4. Check it's working
docker-compose ps
```

That's it! Your app is at http://localhost:3000

---

## 📚 Documentation Index

Choose your path:

### 🎯 I want to understand the basics
→ Read [ENV_QUICK_REFERENCE.md](./ENV_QUICK_REFERENCE.md)
- One-page cheat sheet
- Visual diagrams
- Quick troubleshooting

### 📖 I want detailed explanations
→ Read [ENV_FILES_GUIDE.md](./ENV_FILES_GUIDE.md)
- Complete guide to all .env files
- How Docker uses environment variables
- Deployment scenarios
- Best practices

### 🏗️ I want to see the architecture
→ Read [CONTAINER_ARCHITECTURE.md](./CONTAINER_ARCHITECTURE.md)
- Visual container architecture
- Variable flow diagrams
- Container networking
- Data persistence

### 🐳 I want Docker-specific help
→ Read [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- Docker commands
- Backup and restore
- Troubleshooting
- Production tips

### 🚀 I want general setup instructions
→ Read [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- Both Docker and Cloud deployment
- Step-by-step instructions
- Migration guides
- Security best practices

---

## 🎓 Key Concepts

### Which .env file is used by which container?

```
┌─────────────────────────────────────────────────────┐
│                    .env file                        │
│  (The ONLY file that matters for Docker)           │
└────────────────────┬────────────────────────────────┘
                     │
                     │ Read by docker-compose.yml
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ MongoDB │  │  Redis  │  │   Web   │
   │Container│  │Container│  │Container│
   └─────────┘  └─────────┘  └─────────┘
        │            │            │
        │            │            │
   Gets:        Gets:        Gets:
   MONGO_       REDIS_       DB_URL
   USERNAME     PASSWORD     MONGODB_URI
   MONGO_                    JWT_SECRET
   PASSWORD                  SMTP_*
                             ... all app vars
```

### How does it work?

1. You edit `.env` file
2. `docker-compose.yml` reads `.env`
3. Variables are passed to containers
4. Each container gets what it needs

---

## 🔧 Common Tasks

### Check what variables a container sees
```bash
docker-compose exec web env
docker-compose exec mongodb env
docker-compose exec redis env
```

### Restart after changing .env
```bash
docker-compose restart web
```

### View logs
```bash
docker-compose logs -f web
```

### Access MongoDB shell
```bash
docker-compose exec mongodb mongosh -u admin -p yourpassword
```

### Access Redis CLI
```bash
docker-compose exec redis redis-cli -a yourpassword
```

---

## ❓ FAQ

**Q: Which .env file is actually used?**  
A: Only `.env` (or `.env.local` for local dev). All others are templates.

**Q: Do I need to edit .env.docker?**  
A: No! Copy it to `.env` first, then edit `.env`.

**Q: How do containers get environment variables?**  
A: docker-compose.yml reads `.env` and passes variables to containers.

**Q: Can I use MongoDB Atlas instead of the container?**  
A: Yes! Just set `DB_URL` and `MONGODB_URI` to your Atlas connection string.

**Q: Changes to .env not working?**  
A: Restart containers: `docker-compose restart`

**Q: How do I know which variables each container needs?**  
A: Check [CONTAINER_ARCHITECTURE.md](./CONTAINER_ARCHITECTURE.md) for the complete matrix.

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "MONGODB_URI is undefined" | Add `MONGODB_URI=...` to `.env` |
| Changes not taking effect | Run `docker-compose restart web` |
| Port already in use | Change port in docker-compose.yml |
| Container won't start | Check logs: `docker-compose logs web` |

---

## 📞 Need More Help?

1. Check [ENV_QUICK_REFERENCE.md](./ENV_QUICK_REFERENCE.md) for quick answers
2. Read [ENV_FILES_GUIDE.md](./ENV_FILES_GUIDE.md) for detailed explanations
3. See [CONTAINER_ARCHITECTURE.md](./CONTAINER_ARCHITECTURE.md) for architecture
4. Review [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for Docker-specific issues

---

## 🎉 You're Ready!

Now you understand:
- ✅ Which .env files exist and what they do
- ✅ How Docker uses environment variables
- ✅ Which container gets which variables
- ✅ How to troubleshoot issues

Start deploying! 🚀
