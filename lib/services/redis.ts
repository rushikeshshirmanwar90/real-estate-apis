import { Redis } from "ioredis";

// Create Redis client instance
const redis = new Redis({
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
  console.log("✅ Redis connected successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

// Safe wrapper for Redis GET
export async function safeRedisGet(key: string): Promise<any> {
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
  try {
    await redis.del(...keys);
    return true;
  } catch (error) {
    console.error(`Redis DEL error for keys ${keys.join(", ")}:`, error);
    return false;
  }
}

export default redis;
