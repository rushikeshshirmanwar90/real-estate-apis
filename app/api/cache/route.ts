import { NextRequest, NextResponse } from "next/server";
import redis, { safeRedisGet, safeRedisSet, safeRedisDel } from "@/lib/services/redis";

// GET - Retrieve cached data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const pattern = searchParams.get('pattern');
    const stats = searchParams.get('stats');

    if (stats === 'true') {
      // Return cache statistics (you can extend this)
      return NextResponse.json({
        success: true,
        data: {
          message: 'Redis cache is operational',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!key) {
      return NextResponse.json(
        {
          success: false,
          message: 'Key parameter is required',
        },
        { status: 400 }
      );
    }

    const value = await safeRedisGet(key);
    const exists = await redis.exists(key);
    const ttl = await redis.ttl(key);

    return NextResponse.json({
      success: true,
      data: {
        key,
        value,
        exists,
        ttl: ttl > 0 ? ttl : null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get cache',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Set cache data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value, ttl = 3600 } = body;

    if (!key || !value) {
      return NextResponse.json(
        {
          success: false,
          message: 'Key and value are required',
        },
        { status: 400 }
      );
    }

    const success = await safeRedisSet(key, JSON.stringify(value), ttl);

    return NextResponse.json({
      success,
      message: success ? 'Cache set successfully' : 'Failed to set cache',
      data: {
        key,
        value,
        ttl,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to set cache',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete cache data
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pattern = searchParams.get('pattern');
    const key = searchParams.get('key');
    const flushAll = searchParams.get('flushAll');

    if (flushAll === 'true') {
      try {
        await redis.flushall();
        return NextResponse.json({
          success: true,
          message: 'All cache cleared successfully',
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'Failed to clear all cache',
        });
      }
    }

    if (pattern) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          const success = await safeRedisDel(keys);
          return NextResponse.json({
            success,
            message: success ? `Cache deleted for pattern: ${pattern}` : `Failed to delete cache for pattern: ${pattern}`,
          });
        } else {
          return NextResponse.json({
            success: true,
            message: `No keys found for pattern: ${pattern}`,
          });
        }
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: `Failed to delete cache for pattern: ${pattern}`,
        });
      }
    }

    if (key) {
      const success = await safeRedisDel([key]);
      return NextResponse.json({
        success,
        message: success ? `Cache deleted for key: ${key}` : `Failed to delete cache for key: ${key}`,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Pattern, key, or flushAll parameter is required',
      },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete cache',
        error: error.message,
      },
      { status: 500 }
    );
  }
}