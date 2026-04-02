import { Redis } from "ioredis"

export const client = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) {
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000);
  },
  lazyConnect: true,
  enableOfflineQueue: false, // Prevent queuing commands when disconnected
});

// Handle connection errors gracefully
client.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

// Connect with error handling
client.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err.message);
  console.error('Redis will be unavailable. Check your REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD.');
});