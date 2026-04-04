import { Redis } from "ioredis";

// Check if Redis is enabled via environment variable
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// Create Redis client instance only if enabled
let redis: Redis | null = null;

if (REDIS_ENABLED) {
  redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  // Handle connection events
  redis.on("connect", () => {
    console.log("✅ Redis connected successfully (services)");
  });

  redis.on("error", (err) => {
    console.error("❌ Redis connection error (services):", err);
  });
} else {
  console.log("ℹ️ Redis is DISABLED in services (set REDIS_ENABLED=true to enable)");
}

// Safe wrapper for Redis GET
export async function safeRedisGet(key: string): Promise<any> {
  if (!REDIS_ENABLED || !redis) {
    return null;
  }

  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Redis GET error for key ${key}:`, error);
    return null;
  }
}

// Safe wrapper for Redis SET
export async function safeRedisSet(
  key: string,
  value: string,
  ttl?: number
): Promise<boolean> {
  if (!REDIS_ENABLED || !redis) {
    return false;
  }

  try {
    if (ttl) {
      await redis.setex(key, ttl, value);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (error) {
    console.error(`Redis SET error for key ${key}:`, error);
    return false;
  }
}

// Safe wrapper for Redis DEL
export async function safeRedisDel(keys: string[]): Promise<boolean> {
  if (!REDIS_ENABLED || !redis) {
    return false;
  }

  try {
    await redis.del(...keys);
    return true;
  } catch (error) {
    console.error(`Redis DEL error for keys ${keys.join(", ")}:`, error);
    return false;
  }
}

export default redis;
