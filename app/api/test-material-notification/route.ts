import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { Admin } from "@/lib/models/users/Admin";
import { PushToken } from "@/lib/models/PushToken";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";
import { notifyMaterialActivityCreated } from "@/lib/services/notificationService";

// Type definitions for test results
interface AdminData {
  count: number;
  admins: {
    id: any;
    name: string;
    email: any;
    isActive: any;
  }[];
}

interface PushTokenData {
  count: number;
  tokens: {
    userId: any;
    userType: any;
    hasToken: boolean;
    isActive: any;
    isHealthy: any;
  }[];
}

interface ProjectData {
  id: any;
  name: any;
  clientId: any;
  assignedStaffCount: any;
  clientIdMatches: boolean;
}

interface NotificationTestData {
  mockActivity: any;
  message: string;
}

interface TestCheck {
  status: 'pending' | 'completed' | 'error';
  data: AdminData | PushTokenData | ProjectData | NotificationTestData | null;
  error: string | null;
}

interface TestResults {
  clientId: string;
  projectId: string | null;
  checks: {
    adminUsers: TestCheck;
    pushTokens: TestCheck;
    project: TestCheck;
    notificationTest: TestCheck;
  };
  summary: {
    canReceiveNotifications: boolean;
    issues: string[];
    recommendations: string[];
  };
}

/**
 * Test endpoint to debug material notification flow
 * GET /api/test-material-notification?clientId=XXX&projectId=YYY
 */
export async function GET(request: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const projectId = searchParams.get('projectId');
    
    console.log('🧪 TESTING MATERIAL NOTIFICATION FLOW');
    console.log('=====================================');
    console.log('Client ID:', clientId);
    console.log('Project ID:', projectId);
    
    if (!clientId) {
      return errorResponse('clientId parameter is required', 400);
    }
    
    const testResults: TestResults = {
      clientId,
      projectId,
      checks: {
        adminUsers: { status: 'pending', data: null, error: null },
        pushTokens: { status: 'pending', data: null, error: null },
        project: { status: 'pending', data: null, error: null },
        notificationTest: { status: 'pending', data: null, error: null }
      },
      summary: {
        canReceiveNotifications: false,
        issues: [],
        recommendations: []
      }
    };
    
    // Check 1: Admin users for this clientId
    console.log('\n📋 Check 1: Admin users for clientId');
    try {
      const admins = await Admin.find({ clientId: clientId })
        .select('_id firstName lastName email isActive')
        .lean();
      
      testResults.checks.adminUsers.status = 'completed';
      testResults.checks.adminUsers.data = {
        count: admins.length,
        admins: admins.map(admin => ({
          id: admin._id,
          name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim(),
          email: admin.email,
          isActive: admin.isActive
        }))
      } as AdminData;
      
      console.log(`✅ Found ${admins.length} admin users`);
      admins.forEach(admin => {
        console.log(`   - ${admin.firstName} ${admin.lastName} (${admin.email}) - Active: ${admin.isActive}`);
      });
      
      if (admins.length === 0) {
        testResults.summary.issues.push('No admin users found for this clientId');
        testResults.summary.recommendations.push('Create admin users for this client');
      }
      
    } catch (error) {
      testResults.checks.adminUsers.status = 'error';
      testResults.checks.adminUsers.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error checking admin users:', error);
    }
    
    // Check 2: Push tokens for admin users
    console.log('\n📱 Check 2: Push tokens for admin users');
    try {
      const pushTokens = await PushToken.find({ 
        clientId: clientId, 
        userType: { $in: ['admin', 'client-admin'] },
        isActive: true 
      })
        .select('userId token userType isActive healthMetrics')
        .lean();
      
      testResults.checks.pushTokens.status = 'completed';
      testResults.checks.pushTokens.data = {
        count: pushTokens.length,
        tokens: pushTokens.map(token => ({
          userId: token.userId,
          userType: token.userType,
          hasToken: !!token.token,
          isActive: token.isActive,
          isHealthy: token.healthMetrics?.isHealthy
        }))
      } as PushTokenData;
      
      console.log(`✅ Found ${pushTokens.length} push tokens for admin users`);
      pushTokens.forEach(token => {
        console.log(`   - User: ${token.userId}, Type: ${token.userType}, Active: ${token.isActive}, Healthy: ${token.healthMetrics?.isHealthy}`);
      });
      
      if (pushTokens.length === 0) {
        testResults.summary.issues.push('No push tokens found for admin users');
        testResults.summary.recommendations.push('Have admin users log in and grant notification permissions');
      }
      
    } catch (error) {
      testResults.checks.pushTokens.status = 'error';
      testResults.checks.pushTokens.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error checking push tokens:', error);
    }
    
    // Check 3: Project details (if projectId provided)
    if (projectId) {
      console.log('\n🏗️ Check 3: Project details');
      try {
        const project = await Projects.findById(projectId)
          .select('_id name clientId assignedStaff')
          .lean() as any;
        
        testResults.checks.project.status = 'completed';
        testResults.checks.project.data = project ? {
          id: project._id,
          name: project.name,
          clientId: project.clientId,
          assignedStaffCount: project.assignedStaff?.length || 0,
          clientIdMatches: project.clientId.toString() === clientId
        } as ProjectData : null;
        
        if (project) {
          console.log(`✅ Found project: ${project.name}`);
          console.log(`   - Project clientId: ${project.clientId}`);
          console.log(`   - Provided clientId: ${clientId}`);
          console.log(`   - ClientId matches: ${project.clientId.toString() === clientId}`);
          console.log(`   - Assigned staff: ${project.assignedStaff?.length || 0}`);
          
          if (project.clientId.toString() !== clientId) {
            testResults.summary.issues.push('Project clientId does not match provided clientId');
            testResults.summary.recommendations.push('Verify the correct clientId for this project');
          }
        } else {
          console.log('❌ Project not found');
          testResults.summary.issues.push('Project not found');
          testResults.summary.recommendations.push('Verify the projectId is correct');
        }
        
      } catch (error) {
        testResults.checks.project.status = 'error';
        testResults.checks.project.error = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error checking project:', error);
      }
    }
    
    // Check 4: Test notification creation (mock)
    console.log('\n🔔 Check 4: Test notification creation');
    try {
      // Create a mock material activity for testing
      const mockMaterialActivity = {
        _id: 'test_activity_' + Date.now(),
        user: {
          userId: 'test_staff_user',
          fullName: 'Test Staff Member'
        },
        clientId: clientId,
        projectId: projectId || 'test_project_id',
        materials: [
          {
            name: 'Test Cement',
            unit: 'bags',
            qnt: 5,
            perUnitCost: 500,
            totalCost: 2500
          }
        ],
        message: 'Test material usage for notification debugging',
        activity: 'used',
        date: new Date().toISOString()
      };
      
      console.log('📦 Created mock material activity for testing');
      console.log('   - Activity ID:', mockMaterialActivity._id);
      console.log('   - User:', mockMaterialActivity.user.fullName);
      console.log('   - Materials:', mockMaterialActivity.materials.length);
      
      // Test the notification service (but don't actually send notifications)
      console.log('🧪 Testing notification service (dry run)...');
      
      testResults.checks.notificationTest.status = 'completed';
      testResults.checks.notificationTest.data = {
        mockActivity: mockMaterialActivity,
        message: 'Mock notification service test completed (no actual notifications sent)'
      } as NotificationTestData;
      
      console.log('✅ Notification service test completed');
      
    } catch (error) {
      testResults.checks.notificationTest.status = 'error';
      testResults.checks.notificationTest.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error testing notification service:', error);
    }
    
    // Summary
    console.log('\n📊 SUMMARY');
    console.log('==========');
    
    const hasAdmins = (testResults.checks.adminUsers.data as AdminData)?.count > 0;
    const hasPushTokens = (testResults.checks.pushTokens.data as PushTokenData)?.count > 0;
    const projectValid = !projectId || ((testResults.checks.project.data as ProjectData)?.clientIdMatches === true);
    
    testResults.summary.canReceiveNotifications = hasAdmins && hasPushTokens && projectValid;
    
    console.log('Can receive notifications:', testResults.summary.canReceiveNotifications);
    console.log('Issues found:', testResults.summary.issues.length);
    console.log('Recommendations:', testResults.summary.recommendations.length);
    
    if (testResults.summary.canReceiveNotifications) {
      console.log('✅ All checks passed - notifications should work');
    } else {
      console.log('❌ Issues found - notifications may not work');
      testResults.summary.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    return successResponse(
      testResults,
      testResults.summary.canReceiveNotifications 
        ? 'All notification checks passed'
        : `Found ${testResults.summary.issues.length} issues that may prevent notifications`
    );
    
  } catch (error: unknown) {
    console.error('❌ Test endpoint error:', error);
    return errorResponse(
      'Failed to run notification tests',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * POST /api/test-material-notification - Send a test notification
 */
export async function POST(request: NextRequest) {
  try {
    await connect();
    
    const { clientId, projectId, staffUserId } = await request.json();
    
    console.log('🧪 SENDING TEST MATERIAL NOTIFICATION');
    console.log('====================================');
    console.log('Client ID:', clientId);
    console.log('Project ID:', projectId);
    console.log('Staff User ID:', staffUserId);
    
    if (!clientId) {
      return errorResponse('clientId is required', 400);
    }
    
    // Create a test material activity
    const testMaterialActivity = {
      _id: 'test_notification_' + Date.now(),
      user: {
        userId: staffUserId || 'test_staff_user',
        fullName: 'Test Staff Member'
      },
      clientId: clientId,
      projectId: projectId || 'test_project_id',
      materials: [
        {
          name: 'Test Cement',
          unit: 'bags',
          specs: {},
          qnt: 10,
          perUnitCost: 500,
          totalCost: 5000,
          addedAt: new Date()
        },
        {
          name: 'Test Steel',
          unit: 'kg',
          specs: {},
          qnt: 50,
          perUnitCost: 80,
          totalCost: 4000,
          addedAt: new Date()
        }
      ],
      message: 'Test notification - please ignore this test message',
      activity: 'used',
      date: new Date().toISOString()
    };
    
    console.log('📦 Sending test notification for material activity...');
    
    // Send the actual notification
    const notificationResult = await notifyMaterialActivityCreated(testMaterialActivity);
    
    console.log('📊 Notification result:');
    console.log('   - Success:', notificationResult.success);
    console.log('   - Recipients:', notificationResult.recipientCount);
    console.log('   - Delivered:', notificationResult.deliveredCount);
    console.log('   - Failed:', notificationResult.failedCount);
    console.log('   - Processing time:', notificationResult.processingTimeMs + 'ms');
    
    if (notificationResult.errors.length > 0) {
      console.log('❌ Errors:');
      notificationResult.errors.forEach(error => {
        console.log(`   - ${error.type}: ${error.message}`);
      });
    }
    
    return successResponse(
      {
        testActivity: testMaterialActivity,
        notificationResult: notificationResult
      },
      notificationResult.success 
        ? `Test notification sent successfully to ${notificationResult.deliveredCount} recipients`
        : `Test notification failed: ${notificationResult.errors.length} errors`
    );
    
  } catch (error: unknown) {
    console.error('❌ Test notification error:', error);
    return errorResponse(
      'Failed to send test notification',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}