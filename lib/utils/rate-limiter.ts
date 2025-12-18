import { NextRequest } from "next/server";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  },
  5 * 60 * 1000
);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const rateLimit = (
  req: NextRequest,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetTime: number } => {
  const identifier =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const key = `${identifier}`;

  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: store[key].resetTime,
    };
  }

  store[key].count++;

  if (store[key].count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: store[key].resetTime,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - store[key].count,
    resetTime: store[key].resetTime,
  };
};
