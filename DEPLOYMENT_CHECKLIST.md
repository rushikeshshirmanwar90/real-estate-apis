# Docker Deployment Checklist ✅

Use this checklist to ensure a smooth deployment.

---

## Pre-Deployment

### 1. Environment Setup
- [ ] Docker is installed (`docker --version`)
- [ ] Docker Compose is installed (`docker-compose --version`)
- [ ] Docker daemon is running (`docker info`)

### 2. Environment File
- [ ] Copied `.env.docker` to `.env` (`cp .env.docker .env`)
- [ ] Edited `.env` with actual values
- [ ] Set strong `MONGO_PASSWORD` (min 16 characters)
- [ ] Set strong `REDIS_PASSWORD` (min 16 characters)
- [ ] Generated `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
- [ ] Updated `SMTP_USER` and `SMTP_PASS` with your email credentials
- [ ] Updated `DOMAIN` and `NEXTAUTH_URL` with your actual domain
- [ ] Verified all required variables are set

### 3. Configuration Review
- [ ] Reviewed `docker-compose.yml`
- [ ] Checked port mappings (3000, 6379, 8001, 27017)
- [ ] Verified no port conflicts on host machine

---

## Deployment

### 4. Initial Deployment
- [ ] Pulled latest images (`docker-compose pull`)
- [ ] Started services (`docker-compose up -d`)
- [ ] Waited for services to start (30-60 seconds)

### 5. Health Checks
- [ ] All services show "healthy" status (`docker-compose ps`)
- [ ] MongoDB container is running
- [ ] Redis container is running
- [ ] Web container is running

### 6. Service Verification
- [ ] MongoDB is accessible (`docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"`)
- [ ] Redis is accessible (`docker-compose exec redis redis-cli -a password ping`)
- [ ] Web app responds at http://localhost:3000
- [ ] No errors in logs (`docker-compose logs`)

---

## Post-Deployment

### 7. Application Testing
- [ ] Can access the application at http://localhost:3000
- [ ] Can log in to the application
- [ ] Database operations work (create/read/update/delete)
- [ ] Redis caching works (if enabled)
- [ ] Email sending works (if configured)

### 8. Monitoring Setup
- [ ] RedisInsight accessible at http://localhost:8001
- [ ] Can view logs (`docker-compose logs -f`)
- [ ] Set up log rotation (if needed)
- [ ] Set up monitoring alerts (if needed)

### 9. Backup Configuration
- [ ] Tested MongoDB backup (`docker-compose exec mongodb mongodump`)
- [ ] Documented backup procedure
- [ ] Set up automated backups (if needed)
- [ ] Tested restore procedure

---

## Security

### 10. Security Checklist
- [ ] Changed all default passwords
- [ ] `.env` file is in `.gitignore`
- [ ] No secrets committed to git
- [ ] Firewall rules configured (if production)
- [ ] SSL/TLS configured (if production)
- [ ] MongoDB authentication enabled
- [ ] Redis password protection enabled

---

## Documentation

### 11. Documentation Review
- [ ] Read [README_ENV.md](./README_ENV.md)
- [ ] Bookmarked [ENV_QUICK_REFERENCE.md](./ENV_QUICK_REFERENCE.md)
- [ ] Reviewed [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- [ ] Team members know where to find docs

---

## Troubleshooting Checklist

If something goes wrong:

### MongoDB Issues
- [ ] Check MongoDB logs (`docker-compose logs mongodb`)
- [ ] Verify credentials in `.env`
- [ ] Check MongoDB health (`docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"`)
- [ ] Verify volume permissions

### Redis Issues
- [ ] Check Redis logs (`docker-compose logs redis`)
- [ ] Verify password in `.env`
- [ ] Test Redis connection (`docker-compose exec redis redis-cli -a password ping`)
- [ ] Check if Redis is enabled (`REDIS_ENABLED=true`)

### Web Application Issues
- [ ] Check web logs (`docker-compose logs web`)
- [ ] Verify all environment variables (`docker-compose exec web env`)
- [ ] Check if MongoDB and Redis are healthy
- [ ] Restart web container (`docker-compose restart web`)

### General Issues
- [ ] All containers running (`docker-compose ps`)
- [ ] No port conflicts (`netstat -tulpn | grep -E '3000|6379|8001|27017'`)
- [ ] Enough disk space (`df -h`)
- [ ] Enough memory (`free -h`)

---

## Maintenance Checklist

### Daily
- [ ] Check service status (`docker-compose ps`)
- [ ] Review logs for errors (`docker-compose logs --tail=100`)

### Weekly
- [ ] Backup database
- [ ] Review disk usage (`docker system df`)
- [ ] Check for security updates

### Monthly
- [ ] Update Docker images (`docker-compose pull && docker-compose up -d`)
- [ ] Review and rotate logs
- [ ] Test backup restore procedure
- [ ] Review security settings

---

## Quick Commands Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart after .env changes
docker-compose restart web

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Access MongoDB
docker-compose exec mongodb mongosh -u admin -p yourpassword

# Access Redis
docker-compose exec redis redis-cli -a yourpassword

# Backup MongoDB
docker-compose exec mongodb mongodump --out /data/backup

# Check environment variables
docker-compose exec web env | grep -E "MONGO|REDIS|DB"
```

---

## Emergency Procedures

### If containers won't start:
```bash
# Stop everything
docker-compose down

# Remove containers (keeps volumes)
docker-compose rm -f

# Start fresh
docker-compose up -d
```

### If data is corrupted:
```bash
# Stop services
docker-compose down

# Restore from backup
docker-compose up -d mongodb
docker-compose exec mongodb mongorestore /data/backup

# Start other services
docker-compose up -d
```

### If you need to reset everything:
```bash
# ⚠️ WARNING: This deletes all data!
docker-compose down -v
docker-compose up -d
```

---

## Deployment Complete! 🎉

Once all items are checked:
- [ ] Deployment is complete
- [ ] Application is accessible
- [ ] All services are healthy
- [ ] Backups are configured
- [ ] Team is notified
- [ ] Documentation is updated

---

## Notes

Use this space for deployment-specific notes:

```
Deployment Date: _______________
Deployed By: _______________
Environment: _______________
Domain: _______________
Special Configurations: _______________
Issues Encountered: _______________
```

---

## Support

If you need help:
1. Check [ENV_QUICK_REFERENCE.md](./ENV_QUICK_REFERENCE.md) for quick fixes
2. Review [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for detailed troubleshooting
3. Check logs: `docker-compose logs -f`
4. Review [CONTAINER_ARCHITECTURE.md](./CONTAINER_ARCHITECTURE.md) for architecture details
