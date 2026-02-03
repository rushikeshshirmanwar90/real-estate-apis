import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

/**
 * GET /api/notifications/config
 * 
 * Get notification service configuration and health status
 */
export const GET = async (req: NextRequest) => {
  try {
    console.log('⚙️ Getting notification service configuration...');

    // Check environment variables
    const expoAccessToken = process.env.EXPO_ACCESS_TOKEN;
    const nodeEnv = process.env.NODE_ENV;
    
    const config = {
      expoAccessToken: !!expoAccessToken, // Return boolean, not the actual token
      pushServiceEnabled: true,
      retryManagerEnabled: true,
      circuitBreakerEnabled: true,
      environment: nodeEnv || 'development',
      timestamp: new Date().toISOString(),
      
      // Service health indicators
      services: {
        expo: {
          configured: !!expoAccessToken,
          endpoint: 'https://exp.host/--/api/v2/push/send'
        },
        database: {
          connected: true // We'll assume connected if we got this far
        },
        retryManager: {
          enabled: true,
          maxRetries: 3
        }
      },
      
      // Configuration details (safe to expose)
      settings: {
        maxBatchSize: 100,
        defaultTTL: 3600,
        defaultPriority: 'high',
        timeoutMs: 15000
      }
    };

    console.log('✅ Notification service configuration retrieved');

    return successResponse(
      config,
      "Notification service configuration retrieved successfully",
      200
    );

  } catch (error: unknown) {
    console.error('❌ Error getting notification config:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to get notification configuration", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};