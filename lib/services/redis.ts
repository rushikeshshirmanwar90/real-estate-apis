import Redis from "ioredis";

declare global {
  var redis: Redis | undefined;
}

const createRedisConnection = () => {
  return new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    // Gracefully retry on disconnect
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      console.log(`Redis reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    // Handle connection events
    connectTimeout: 10000,
    commandTimeout: 5000,
  });
};

const redis = global.redis ?? createRedisConnection();

// Add error handling
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('ready', () => {
  console.log('Redis ready to accept commands');
});

if (process.env.NODE_ENV !== "production") {
  global.redis = redis;
}

// ─── Key helpers ──────────────────────────────────────────────────────────────

/** Paginated GET cache: materials:available:<projectId>:<clientId>:<page>:<limit>:<sortBy>:<sortOrder> */
export const materialPageKey = (
  projectId: string,
  clientId: string,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: string
) => `materials:available:${projectId}:${clientId}:${page}:${limit}:${sortBy}:${sortOrder}`;

/** Project-level cache: just MaterialAvailable + MaterialUsed fields */
export const projectMaterialFieldsKey = (projectId: string) =>
  `project:materialFields:${projectId}`;

/** Pattern to wipe ALL paginated pages for a project (used on write) */
export const materialPagePattern = (projectId: string) =>
  `materials:available:${projectId}:*`;

// ─── TTL constants (seconds) ─────────────────────────────────────────────────
export const TTL_MATERIAL_PAGE = 60;        // 1 min for paginated list
export const TTL_PROJECT_FIELDS = 120;      // 2 min for MaterialAvailable+MaterialUsed

// ─── Safe Redis operations ──────────────────────────────────────────────────
export const safeRedisGet = async (key: string): Promise<string | null> => {
  try {
    if (!redis || redis.status !== 'ready') {
      return null;
    }
    return await redis.get(key);
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

export const safeRedisSet = async (
  key: string, 
  value: string, 
  ttl?: number
): Promise<boolean> => {
  try {
    if (!redis || redis.status !== 'ready') {
      return false;
    }
    if (ttl) {
      await redis.set(key, value, "EX", ttl);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
};

export const safeRedisDel = async (keys: string[]): Promise<boolean> => {
  try {
    if (!redis || redis.status !== 'ready' || keys.length === 0) {
      return false;
    }
    await redis.del(...keys);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
};

export default redis;