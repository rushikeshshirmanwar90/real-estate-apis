import { Redis } from "ioredis"

// Check if Redis is enabled via environment variable
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// Create Redis client only if enabled
let client: Redis | null = null;

if (REDIS_ENABLED) {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');
  
  console.log(`🔧 Redis configuration: host=${redisHost}, port=${redisPort}`);
  
  client = new Redis({
    host: redisHost,
    port: redisPort,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 5) {
        console.error(`❌ Redis max retries (5) exceeded`);
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
    lazyConnect: true,
    family: 4,
  });

  // Handle connection events
  client.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  client.on('ready', () => {
    console.log('✅ Redis is ready to accept commands');
  });

  client.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
  });

  client.on('close', () => {
    console.warn('⚠️ Redis connection closed');
  });

  client.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  client.on('end', () => {
    console.warn('⚠️ Redis connection ended');
  });

  // Try to connect with error handling
  client.connect().catch((err) => {
    console.error('❌ Failed to connect to Redis:', err.message);
    console.warn('⚠️ Continuing without Redis cache');
  });
} else {
  console.log('ℹ️ Redis is DISABLED (set REDIS_ENABLED=true to enable)');
}

export { client };

// Safe wrapper for Redis operations
export async function safeRedisOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!REDIS_ENABLED || !client) {
    return fallback;
  }

  try {
    if (client.status === 'ready' || client.status === 'connect') {
      return await operation();
    }
    return fallback;
  } catch (error) {
    console.error('❌ Redis operation failed:', error);
    return fallback;
  }
}
