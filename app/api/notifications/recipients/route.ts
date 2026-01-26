import connect from "@/lib/db";
import { Admin } from "@/lib/models/users/Admin";
import { Staff } from "@/lib/models/users/Staff";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

// Type definitions for notification recipients
interface NotificationRecipient {
  userId: string;
  userType: 'admin' | 'staff';
  clientId: string;
  fullName: string;
  email: string;
  role?: string;
}

/**
 * GET /api/notifications/recipients
 * 
 * Returns users who should receive notifications for a given client
 * Used by the notification system to determine who gets notified
 */
export async function GET(request: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const projectId = searchParams.get('projectId'); // Optional filter
    
    console.log('🔍 Getting notification recipients for clientId:', clientId);
    
    if (!clientId) {
      return errorResponse('clientId is required', 400);
    }
    
    // Get all users for this client
    // Query both Admin and Staff collections
    const [admins, staff] = await Promise.all([
      Admin.find({ clientId: clientId }).select('_id firstName lastName email'),
      Staff.find({ 'clients.clientId': clientId }).select('_id firstName lastName email role clients')
    ]);
    
    console.log('👥 Found', admins.length, 'admins and', staff.length, 'staff for client');
    
    // Format recipients for notification system
    const recipients: NotificationRecipient[] = [];
    
    // Add admins
    admins.forEach(admin => {
      const fullName = `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 
                      admin.email?.split('@')[0] || 'Admin';
      
      recipients.push({
        userId: admin._id.toString(),
        userType: 'admin',
        clientId: clientId,
        fullName: fullName,
        email: admin.email
      });
    });
    
    // Add staff members
    staff.forEach(staffMember => {
      const fullName = `${staffMember.firstName || ''} ${staffMember.lastName || ''}`.trim() || 
                      staffMember.email?.split('@')[0] || 'Staff';
      
      recipients.push({
        userId: staffMember._id.toString(),
        userType: 'staff',
        clientId: clientId,
        fullName: fullName,
        email: staffMember.email,
        role: staffMember.role
      });
    });
    
    console.log('✅ Returning', recipients.length, 'recipients');
    console.log('📋 Recipients breakdown:');
    const adminCount = recipients.filter(r => r.userType === 'admin').length;
    const staffCount = recipients.filter(r => r.userType === 'staff').length;
    console.log(`   - Admins: ${adminCount}`);
    console.log(`   - Staff: ${staffCount}`);
    
    return successResponse(
      { recipients },
      `Found ${recipients.length} notification recipients`
    );
    
  } catch (error: unknown) {
    console.error('❌ Get recipients error:', error);
    return errorResponse(
      'Failed to get notification recipients', 
      500, 
      error
    );
  }
}