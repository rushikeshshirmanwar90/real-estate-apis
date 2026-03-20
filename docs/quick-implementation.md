# Quick Redis Caching Implementation Guide

## Step 1: Install Dependencies
```bash
cd real-estate-apis
npm install redis @types/redis
```

## Step 2: Set Environment Variables
Add to your `.env` file:
```env
REDIS_URL=redis://localhost:6379
CACHE_DEFAULT_TTL=3600
CACHE_ENABLED=true
```

## Step 3: Start Redis Server
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally (macOS)
brew install redis
brew services start redis
```

## Step 4: Update Existing APIs

### For Read-Heavy APIs (like your payment schedule GET):
```typescript
import { getCachedResponse, cacheResponse } from "@/lib/middleware/cacheMiddleware";

export async function GET(request: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const customerMobile = searchParams.get('customerMobile');
    
    // Generate cache key
    const cacheKey = bookingId 
      ? `payment-schedule:booking:${bookingId}`
      : `payment-schedule:mobile:${customerMobile}`;
    
    // Try cache first
    const cachedData = await getCachedResponse(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    // Your existing database logic...
    const paymentSchedule = await PaymentSchedule.findOne(query).populate('bookingId');
    
    if (paymentSchedule) {
      // Cache for 5 minutes
      await cacheResponse(cacheKey, paymentSchedule, 300);
    }
    
    return NextResponse.json({
      success: true,
      data: paymentSchedule
    });
    
  } catch (error) {
    // Your existing error handling...
  }
}
```

### For Write APIs (like your registry PUT):
```typescript
import { invalidateCache } from "@/lib/middleware/cacheMiddleware";

export async function PUT(request: NextRequest) {
  try {
    // Your existing update logic...
    await registry.save();
    
    // Invalidate related caches
    await invalidateCache(`registry:*`);
    await invalidateCache(`customer:${registry.customerId}`);
    
    return NextResponse.json({
      success: true,
      message: "Registry status updated successfully",
      data: registry
    });
    
  } catch (error) {
    // Your existing error handling...
  }
}
```

## Step 5: Test Your Implementation

### Test Cache API:
```bash
# Set cache
curl -X POST http://localhost:8080/api/cache \
  -H "Content-Type: application/json" \
  -d '{"key": "test", "value": {"message": "hello"}, "ttl": 300}'

# Get cache
curl "http://localhost:8080/api/cache?key=test"

# Delete cache
curl -X DELETE "http://localhost:8080/api/cache?key=test"
```

### Test Your APIs:
```bash
# First call (cache miss)
curl "http://localhost:8080/api/customer/payment-schedule?bookingId=123"

# Second call (cache hit)
curl "http://localhost:8080/api/customer/payment-schedule?bookingId=123"
```

## Step 6: Monitor Performance

Add logging to see cache performance:
```typescript
console.log(`🎯 Cache HIT for key: ${cacheKey}`);
console.log(`🔍 Cache MISS for key: ${cacheKey}`);
console.log(`💾 Cached response for key: ${cacheKey}`);
```

## Priority APIs to Cache First

Based on your codebase, start with these high-impact APIs:

1. **Customer APIs** - `/api/customer/*`
2. **Project APIs** - `/api/project/*`
3. **Building APIs** - `/api/building/*`
4. **Analytics APIs** - `/api/analytics/*`
5. **Payment Schedule APIs** - `/api/customer/payment-schedule/*`

## Common Patterns

### 1. List APIs (High Cache Value)
- Cache entire result sets
- Use longer TTL (10-30 minutes)
- Invalidate on any related data change

### 2. Detail APIs (Medium Cache Value)
- Cache individual records
- Use medium TTL (5-15 minutes)
- Invalidate on specific record updates

### 3. Search APIs (Variable Cache Value)
- Cache popular search queries
- Use shorter TTL (2-5 minutes)
- Consider cache key normalization