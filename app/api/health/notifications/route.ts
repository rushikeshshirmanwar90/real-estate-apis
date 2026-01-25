import connect from "@/lib/db";
import { PushNotificationService } from "@/lib/services/pushNotificationService";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

// GET: Health check for notification system
export const GET = async (req: NextRequest) => {
  try {
    console.log('🏥 Running notification system health check...');
    
    await connect();
    
    // Run comprehensive health check
    const healthCheck = await PushNotificationService.healthCheck();
    
    // Additional checks
    const checks = {
      database: 'healthy',
      pushService: healthCheck.status,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
    
    // Check database connection
    try {
      const { PushToken } = await import("@/lib/models/PushToken");
      await PushToken.countDocuments({}).limit(1);
      checks.database = 'healthy';
    } catch (dbError) {
      checks.database = 'error';
      console.error('Database health check failed:', dbError);
    }
    
    // Determine overall health
    const isHealthy = checks.database === 'healthy' && checks.pushService === 'healthy';
    const status = isHealthy ? 200 : 503;
    
    const response: {
      status: string;
      checks: typeof checks;
      stats: any;
      uptime: number;
      memory: NodeJS.MemoryUsage;
      environment: string;
      errors?: any;
    } = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      stats: healthCheck.stats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    };
    
    if (healthCheck.errors) {
      response.errors = healthCheck.errors;
    }
    
    console.log(`🏥 Health check completed: ${response.status}`);
    
    return successResponse(
      response,
      `Notification system is ${response.status}`,
      status
    );
    
  } catch (error: unknown) {
    console.error('❌ Health check failed:', error);
    
    const errorResponse = {
      status: 'error',
      checks: {
        database: 'unknown',
        pushService: 'error',
        timestamp: new Date().toISOString(),
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};