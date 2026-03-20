import { NextRequest, NextResponse } from 'next/server';
import redis, { safeRedisGet, safeRedisSet, safeRedisDel } from '../services/redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (request: NextRequest) => string;
  skipCache?: boolean;
  varyBy?: string[]; // Headers to vary cache by (e.g., ['user-id', 'client-id'])
}

export function withCache(options: CacheOptions = {}) {
  return function <T extends any[]>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<NextResponse>>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: T) {
      const request = args[0] as NextRequest;
      
      // Skip cache if specified
      if (options.skipCache || request.nextUrl.searchParams.get('skipCache') === 'true') {
        return method.apply(this, args);
      }

      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(request)
        : generateDefaultCacheKey(request, options.varyBy);

      try {
        // Try to get from cache first
        const cachedResponseStr = await safeRedisGet(cacheKey);
        if (cachedResponseStr) {
          const cachedResponse = JSON.parse(cachedResponseStr);
          console.log(`🎯 Cache HIT for key: ${cacheKey}`);
          return NextResponse.json(cachedResponse.data, { 
            status: cachedResponse.status,
            headers: { 'X-Cache': 'HIT' }
          });
        }

        console.log(`🔍 Cache MISS for key: ${cacheKey}`);
        
        // Execute original method
        const response = await method.apply(this, args);
        
        // Cache successful responses
        if (response.status >= 200 && response.status < 300) {
          const responseData = await response.json();
          const cacheData = {
            data: responseData,
            status: response.status,
            timestamp: new Date().toISOString()
          };
          
          await safeRedisSet(cacheKey, JSON.stringify(cacheData), options.ttl || 300);
          
          console.log(`💾 Cached response for key: ${cacheKey}`);
          
          // Return response with cache header
          return NextResponse.json(responseData, {
            status: response.status,
            headers: { 'X-Cache': 'MISS' }
          });
        }

        return response;
      } catch (error) {
        console.error('Cache middleware error:', error);
        // Fallback to original method if cache fails
        return method.apply(this, args);
      }
    };

    return descriptor;
  };
}

function generateDefaultCacheKey(request: NextRequest, varyBy?: string[]): string {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;
  const searchParams = url.searchParams.toString();
  
  let key = `${method}:${pathname}`;
  
  if (searchParams) {
    key += `:${searchParams}`;
  }
  
  // Add vary headers to key
  if (varyBy) {
    const varyValues = varyBy.map(header => {
      const value = request.headers.get(header) || 'null';
      return `${header}:${value}`;
    }).join('|');
    key += `:${varyValues}`;
  }
  
  return key;
}

// Utility function for manual cache operations
export async function cacheResponse(
  key: string, 
  data: any, 
  ttlSeconds: number = 300
): Promise<boolean> {
  const cacheData = {
    data,
    timestamp: new Date().toISOString()
  };
  return safeRedisSet(key, JSON.stringify(cacheData), ttlSeconds);
}

export async function getCachedResponse<T = any>(key: string): Promise<T | null> {
  const cachedStr = await safeRedisGet(key);
  if (cachedStr) {
    const cached = JSON.parse(cachedStr);
    return cached.data;
  }
  return null;
}

export async function invalidateCache(pattern: string): Promise<boolean> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      return await safeRedisDel(keys);
    }
    return true;
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return false;
  }
}