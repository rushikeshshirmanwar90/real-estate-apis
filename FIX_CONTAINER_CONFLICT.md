# Fix: Container Name Conflict

## Error
```
Error response from daemon: Conflict. The container name "/real-estate-mongodb" 
is already in use by container "f63c7f6c68224e1d5b9d643f3b49be6c2985e2fdee844fd488b347509270eded"
```

## Solution

### Option 1: Remove Old Container (Recommended)

```bash
# Stop and remove the old container
docker stop real-estate-mongodb
docker rm real-estate-mongodb

# Now deploy again
docker-compose -f docker-compose.mongodb.yml up -d
```

### Option 2: Remove All Stopped Containers

```bash
# Remove all stopped containers
docker container prune -f

# Deploy
docker-compose -f docker-compose.mongodb.yml up -d
```

### Option 3: Force Recreate

```bash
# Force recreate containers
docker-compose -f docker-compose.mongodb.yml up -d --force-recreate
```

### Option 4: Complete Cleanup (⚠️ Removes data!)

```bash
# Stop and remove everything including volumes
docker-compose -f docker-compose.mongodb.yml down -v

# Start fresh
docker-compose -f docker-compose.mongodb.yml up -d
```

## Quick Fix Command

```bash
docker stop real-estate-mongodb && docker rm real-estate-mongodb && docker-compose -f docker-compose.mongodb.yml up -d
```

## Verify

```bash
# Check container is running
docker ps | grep mongodb

# Check logs
docker-compose -f docker-compose.mongodb.yml logs -f
```
