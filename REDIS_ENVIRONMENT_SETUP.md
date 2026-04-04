# Redis Environment Configuration Guide

## Problem
You were experiencing Redis authentication errors (`WRONGPASS invalid username-password pair`) in local development, while production worked fine. This happened because:
- Production has Redis enabled with authentication
- Local development doesn't have Redis running or has it without authentication

## Solution
The code now supports environment-based Redis configuration through the `REDIS_ENABLED` flag.

## Configuration

### Local Development (.env)
Set `REDIS_ENABLED=false` to disable Redis completely:

```env
REDIS_ENABLED=false
REDIS_HOST=187.127.137.30
REDIS_PORT=6379
REDIS_PASSWORD=Exponentor@Rushikesh@123
```

When disabled:
- No Redis connection attempts
- All cache operations return fallback values
- No authentication errors
- Application works without Redis

### Production (.env or environment variables)
Set `REDIS_ENABLED=true` to enable Redis caching:

```env
REDIS_ENABLED=true
REDIS_HOST=187.127.137.30
REDIS_PORT=6379
REDIS_PASSWORD=Exponentor@Rushikesh@123
```

When enabled:
- Redis connects with provided credentials
- Caching works normally
- Performance benefits from Redis

## How It Works

### Updated Files

1. **lib/redis.ts** - Main Redis client
   - Checks `REDIS_ENABLED` before creating client
   - Returns `null` client if disabled
   - Safe operations return fallback values

2. **lib/services/redis.ts** - Redis service functions
   - All functions check if Redis is enabled
   - Return appropriate fallback values when disabled
   - No errors thrown when Redis is unavailable

### Code Changes

```typescript
// Before (always tries to connect)
export const client = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  password: process.env.REDIS_PASSWORD,
  // ...
});

// After (conditional connection)
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';
let client: Redis | null = null;

if (REDIS_ENABLED) {
  client = new Redis({
    // ... config
  });
} else {
  console.log('ℹ️ Redis is DISABLED');
}
```

## Quick Start

### For Local Development
1. Open `real-estate-apis/.env`
2. Set `REDIS_ENABLED=false`
3. Restart your development server
4. No more Redis errors!

### For Production Deployment
1. Set environment variable `REDIS_ENABLED=true`
2. Ensure Redis credentials are correct
3. Deploy as normal

## Testing

### Test Local (Redis Disabled)
```bash
cd real-estate-apis
# Ensure REDIS_ENABLED=false in .env
npm run dev
```

You should see:
```
ℹ️ Redis is DISABLED (set REDIS_ENABLED=true to enable)
```

### Test Production (Redis Enabled)
```bash
# Set REDIS_ENABLED=true in production environment
# Deploy and check logs
```

You should see:
```
✅ Redis connected successfully
✅ Redis is ready to accept commands
```

## Switching Between Environments

### Option 1: Manual Toggle
Edit `.env` file and change `REDIS_ENABLED` value:
- `REDIS_ENABLED=false` for local
- `REDIS_ENABLED=true` for production

### Option 2: Multiple .env Files
Create separate files:
- `.env.local` - for local development (REDIS_ENABLED=false)
- `.env.production` - for production (REDIS_ENABLED=true)

Use the appropriate file based on your environment.

## Troubleshooting

### Still Getting Redis Errors?
1. Check `.env` file has `REDIS_ENABLED=false`
2. Restart your development server completely
3. Clear Next.js cache: `rm -rf .next`
4. Check console for "Redis is DISABLED" message

### Redis Not Working in Production?
1. Verify `REDIS_ENABLED=true` in production environment
2. Check Redis credentials are correct
3. Ensure Redis server is accessible from production
4. Check production logs for connection messages

### Cache Not Working?
- If Redis is disabled, caching won't work (expected behavior)
- Application will fetch fresh data on every request
- Enable Redis in production for caching benefits

## Benefits

✅ No more authentication errors in local development
✅ Easy switching between environments
✅ Production caching still works perfectly
✅ Graceful fallback when Redis is unavailable
✅ Single environment variable controls everything

## Notes

- When Redis is disabled, the application works normally but without caching
- All Redis operations safely return fallback values
- No code changes needed in API routes - they work with or without Redis
- Production performance benefits from Redis caching
- Local development is simpler without Redis dependency
