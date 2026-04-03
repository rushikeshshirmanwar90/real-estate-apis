import { Redis } from "ioredis"

export const client = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  retryStrategy(times) {
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
  lazyConnect: false,
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


// Safe wrapper for Redis operations
export async function safeRedisOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    if (client.status === 'ready' || client.status === 'connect') {
      return await operation();
    }
    console.warn('⚠️ Redis not ready, using fallback');
    return fallback;
  } catch (error) {
    console.error('❌ Redis operation failed:', error);
    return fallback;
  }
}
