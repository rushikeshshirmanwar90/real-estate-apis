import redis, { safeRedisGet, safeRedisSet, safeRedisDel } from "@/lib/services/redis";

/**
 * Get cached response from Redis
 * @param key - Cache key
 * @returns Cached data or null if not found
 */
export async function getCachedResponse(key: string): Promise<any> {
  try {
    return await safeRedisGet(key);
  } catch (error) {
    console.error(`Failed to get cached response for key ${key}:`, error);
    return null;
  }
}

/**
 * Cache response in Redis
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttl - Time to live in seconds (default: 3600 = 1 hour)
 * @returns Success status
 */
export async function cacheResponse(
  key: string,
  data: any,
  ttl: number = 3600
): Promise<boolean> {
  try {
    const serializedData = JSON.stringify(data);
    return await safeRedisSet(key, serializedData, ttl);
  } catch (error) {
    console.error(`Failed to cache response for key ${key}:`, error);
    return false;
  }
}

/**
 * Invalidate cache by pattern or specific key
 * @param pattern - Redis key pattern (e.g., 'projects:*') or specific key
 * @returns Success status
 */
export async function invalidateCache(pattern: string): Promise<boolean> {
  try {
    // If pattern contains wildcard, find all matching keys
    if (pattern.includes('*')) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        return await safeRedisDel(keys);
      }
      return true; // No keys to delete
    } else {
      // Single key deletion
      return await safeRedisDel([pattern]);
    }
  } catch (error) {
    console.error(`Failed to invalidate cache for pattern ${pattern}:`, error);
    return false;
  }
}

/**
 * Clear all cache
 * @returns Success status
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    await redis.flushall();
    return true;
  } catch (error) {
    console.error("Failed to clear all cache:", error);
    return false;
  }
}
