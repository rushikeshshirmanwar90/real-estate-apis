# Critical Redis Routes That Need Fixing

## ⚠️ IMPORTANT: These routes will crash when REDIS_ENABLED=false

All these files import `client` from `@/lib/redis` and call methods directly without null checks.

## Files That MUST Be Fixed (22 total)

### High Priority (Most Used)
1. ✅ `app/api/(Xsite)/material-usage/route.ts` - FIXED
2. ❌ `app/api/(Xsite)/material/route.ts` - GET materials (CRITICAL)
3. ❌ `app/api/(Xsite)/material/add-stock/route.ts` - Add stock (CRITICAL)
4. ❌ `app/api/material-usage-batch/route.ts` - Batch operations (CRITICAL)
5. ❌ `app/api/project/route.ts` - Project CRUD (CRITICAL)
6. ❌ `app/api/labor/route.ts` - Labor operations (CRITICAL)

### Medium Priority
7. ❌ `app/api/(Xsite)/materialActivity/route.ts`
8. ❌ `app/api/(Xsite)/mini-section/route.ts`
9. ❌ `app/api/activity/route.ts`
10. ❌ `app/api/equipment/route.ts`
11. ❌ `app/api/equipment/bulk/route.ts`
12. ❌ `app/api/property/route.ts`
13. ❌ `app/api/building/route.ts`
14. ❌ `app/api/rowHouse/route.ts`
15. ❌ `app/api/section/route.ts`
16. ❌ `app/api/otherSection/route.ts`
17. ❌ `app/api/completion/route.ts`

### Lower Priority
18. ❌ `app/api/users/staff/route.ts`
19. ❌ `app/api/users/admin/route.ts`
20. ❌ `app/api/clients/route.ts`
21. ❌ `app/api/clients/staff/route.ts`
22. ❌ `app/api/clients/clear-cache/route.ts`
23. ❌ `app/api/equipment/categories/route.ts`

## The Problem

All these files have code like:
```typescript
import { client } from "@/lib/redis";

// This crashes when client is null (REDIS_ENABLED=false)
const data = await client.get(key);  // ❌ TypeError: Cannot read property 'get' of null
await client.set(key, value);        // ❌ TypeError: Cannot read property 'set' of null
const keys = await client.keys(pattern); // ❌ TypeError: Cannot read property 'keys' of null
await client.del(...keys);           // ❌ TypeError: Cannot read property 'del' of null
```

## The Solution

Replace with safe helpers:
```typescript
import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  invalidateCachePattern,
  safeRedisDelCache 
} from "@/lib/utils/redis-helpers";

// These work whether Redis is enabled or not
const data = await safeRedisGetCache(key);  // ✅ Returns null if Redis disabled
await safeRedisSetCache(key, value, 'EX', 86400); // ✅ Returns false if Redis disabled
await invalidateCachePattern(`material:${projectId}:*`); // ✅ Safe
await safeRedisDelCache(key1, key2); // ✅ Safe
```

## Quick Fix Pattern

For each file:

### 1. Update Import
```typescript
// OLD
import { client } from "@/lib/redis";

// NEW
import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  invalidateCachePattern,
  safeRedisDelCache 
} from "@/lib/utils/redis-helpers";
```

### 2. Replace GET Operations
```typescript
// OLD
let cacheValue = await client.get(cacheKey);
if (cacheValue) {
  cacheValue = JSON.parse(cacheValue);
  return NextResponse.json(cacheValue);
}

// NEW
const cachedData = await safeRedisGetCache(cacheKey);
if (cachedData) {
  const cacheValue = JSON.parse(cachedData);
  return NextResponse.json(cacheValue);
}
```

### 3. Replace SET Operations
```typescript
// OLD
await client.set(cacheKey, JSON.stringify(data), 'EX', 86400);

// NEW
await safeRedisSetCache(cacheKey, JSON.stringify(data), 'EX', 86400);
```

### 4. Replace KEYS + DEL Operations
```typescript
// OLD
const keys = await client.keys(`material:${projectId}:*`);
if (keys.length > 0) {
  await Promise.all(keys.map(key => client.del(key)));
}

// NEW
await invalidateCachePattern(`material:${projectId}:*`);
```

### 5. Replace Single DEL Operations
```typescript
// OLD
await client.del(`project:${projectId}`);

// NEW
await safeRedisDelCache(`project:${projectId}`);
```

## Why This Matters

When `REDIS_ENABLED=false`:
- Direct `client` calls crash with TypeError
- Your API returns 500 errors
- Local development is broken

With safe helpers:
- No crashes, ever
- API works normally without caching
- Local development works perfectly
- Production caching still works

## Recommendation

Fix the HIGH PRIORITY routes first (they're the most used):
1. material/route.ts
2. material/add-stock/route.ts  
3. material-usage-batch/route.ts
4. project/route.ts
5. labor/route.ts

Then fix the rest when you have time.
