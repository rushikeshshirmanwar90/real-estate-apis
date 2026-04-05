import { client } from "@/lib/redis";

/**
 * Safe Redis GET operation
 * Returns null if Redis is disabled or operation fails
 */
export async function safeRedisGetCache(key: string): Promise<string | null> {
  if (!client) {
    return null;
  }
  
  try {
    return await client.get(key);
  } catch (error) {
    console.warn(`⚠️ Redis GET failed for key ${key}:`, error);
    return null;
  }
}

/**
 * Safe Redis SET operation
 * Returns true if successful, false if Redis is disabled or operation fails
 */
export async function safeRedisSetCache(
  key: string,
  value: string,
  expiryMode?: 'EX' | 'PX',
  time?: number
): Promise<boolean> {
  if (!client) {
    return false;
  }
  
  try {
    if (expiryMode && time) {
      await client.set(key, value, expiryMode, time);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    console.warn(`⚠️ Redis SET failed for key ${key}:`, error);
    return false;
  }
}

/**
 * Safe Redis DEL operation
 * Returns number of keys deleted, 0 if Redis is disabled or operation fails
 */
export async function safeRedisDelCache(...keys: string[]): Promise<number> {
  if (!client || keys.length === 0) {
    return 0;
  }
  
  try {
    return await client.del(...keys);
  } catch (error) {
    console.warn(`⚠️ Redis DEL failed for keys ${keys.join(', ')}:`, error);
    return 0;
  }
}

/**
 * Safe Redis KEYS operation
 * Returns array of matching keys, empty array if Redis is disabled or operation fails
 */
export async function safeRedisKeysCache(pattern: string): Promise<string[]> {
  if (!client) {
    return [];
  }
  
  try {
    return await client.keys(pattern);
  } catch (error) {
    console.warn(`⚠️ Redis KEYS failed for pattern ${pattern}:`, error);
    return [];
  }
}

/**
 * Safe cache invalidation by pattern
 * Finds all keys matching pattern and deletes them
 * Returns number of keys deleted
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  if (!client) {
    console.log(`ℹ️ Redis disabled, skipping cache invalidation for pattern: ${pattern}`);
    return 0;
  }
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      const deleted = await client.del(...keys);
      console.log(`✅ Invalidated ${deleted} cache keys matching pattern: ${pattern}`);
      return deleted;
    }
    return 0;
  } catch (error) {
    console.warn(`⚠️ Cache invalidation failed for pattern ${pattern}:`, error);
    return 0;
  }
}
