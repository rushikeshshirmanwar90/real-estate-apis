import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { NotificationMetrics, NotificationQueue } from "@/lib/middleware/notificationMiddleware";
import { PushNotificationService } from "@/lib/services/pushNotificationService";
import connect from "@/lib/db";

// GET: Get notification metrics and system status
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    
    console.log('📊 Fetching notification metrics...');
    
    // Get runtime metrics
    const runtimeMetrics = NotificationMetrics.getMetrics();
    
    // Get queue status
    const queueStatus = NotificationQueue.getQueueStatus();
    
    // Get database statistics
    const dbStats = await PushNotificationService.getStatistics();
    
    // Get system health
    const healthCheck = await PushNotificationService.healthCheck();
    
    // Calculate additional metrics
    const now = Date.now();
    const uptimeHours = (runtimeMetrics.uptime / (1000 * 60 * 60)).toFixed(2);
    
    const metrics = {
      // Runtime metrics
      runtime: {
        ...runtimeMetrics,
        uptimeHours: parseFloat(uptimeHours),
        successRate: runtimeMetrics.successRate.toFixed(2) + '%',
        averageResponseTime: Math.round(runtimeMetrics.averageResponseTime) + 'ms',
      },
      
      // Queue metrics
      queue: queueStatus,
      
      // Database metrics
      database: dbStats,
      
      // System health
      health: {
        status: healthCheck.status,
        timestamp: healthCheck.timestamp,
      },
      
      // Performance indicators
      performance: {
        notificationsPerHour: runtimeMetrics.uptime > 0 
          ? Math.round((runtimeMetrics.totalNotificationsSent / (runtimeMetrics.uptime / (1000 * 60 * 60))))
          : 0,
        errorRate: ((runtimeMetrics.totalNotificationsFailed / 
          Math.max(1, runtimeMetrics.totalNotificationsSent + runtimeMetrics.totalNotificationsFailed)) * 100).toFixed(2) + '%',
      },
      
      // System info
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        },
        uptime: Math.round(process.uptime()) + 's',
      },
      
      // Timestamps
      generatedAt: new Date().toISOString(),
    };
    
    console.log('✅ Metrics generated successfully');
    
    return successResponse(
      metrics,
      "Notification metrics retrieved successfully",
      200
    );
    
  } catch (error: unknown) {
    console.error('❌ Error fetching notification metrics:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to fetch metrics", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// POST: Reset metrics or perform maintenance operations
export const POST = async (req: NextRequest) => {
  try {
    const { action } = await req.json();
    
    console.log(`🔧 Performing metrics action: ${action}`);
    
    switch (action) {
      case 'reset':
        NotificationMetrics.resetMetrics();
        return successResponse(
          { action: 'reset', timestamp: new Date().toISOString() },
          "Metrics reset successfully",
          200
        );
        
      case 'clear-queue':
        NotificationQueue.clearQueue();
        return successResponse(
          { action: 'clear-queue', timestamp: new Date().toISOString() },
          "Notification queue cleared successfully",
          200
        );
        
      case 'cleanup-tokens':
        await connect();
        const cleanedCount = await PushNotificationService.cleanupInvalidTokens();
        return successResponse(
          { 
            action: 'cleanup-tokens', 
            cleanedCount,
            timestamp: new Date().toISOString() 
          },
          `Cleaned up ${cleanedCount} invalid tokens`,
          200
        );
        
      default:
        return errorResponse(
          "Invalid action. Supported actions: reset, clear-queue, cleanup-tokens",
          400
        );
    }
    
  } catch (error: unknown) {
    console.error('❌ Error performing metrics action:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to perform action", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};