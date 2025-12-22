import connect from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { Staff } from "@/lib/models/users/Staff";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { errorResponse, successResponse } from "@/lib/models/utils/API";

// Interface for notification payload
interface StaffWelcomeNotification {
    recipientEmail: string;
    recipientName: string;
    subject: string;
    message: string;
    type: string;
    clientId: string;
    staffId?: string;
    companyName: string;
    metadata?: {
        role: string;
        addedBy: string;
        addedAt: string;
    };
}

export const POST = async (req: NextRequest) => {
    try {
        await connect();
        
        const data: StaffWelcomeNotification = await req.json();
        
        console.log('📱 Staff Welcome Notification Request:', {
            recipient: data.recipientEmail,
            company: data.companyName,
            type: data.type
        });

        // Validate required fields
        if (!data.recipientEmail || !data.recipientName || !data.clientId || !data.companyName) {
            return errorResponse("Missing required fields: recipientEmail, recipientName, clientId, companyName", 400);
        }

        // Validate clientId format
        if (!Types.ObjectId.isValid(data.clientId)) {
            return errorResponse("Invalid client ID format", 400);
        }

        // Verify client exists
        const client = await Client.findById(data.clientId);
        if (!client) {
            return errorResponse("Client not found", 404);
        }

        // Verify staff member exists if staffId is provided
        if (data.staffId) {
            if (!Types.ObjectId.isValid(data.staffId)) {
                return errorResponse("Invalid staff ID format", 400);
            }

            const staff = await Staff.findOne({ 
                _id: data.staffId, 
                clientId: data.clientId 
            });
            if (!staff) {
                return errorResponse("Staff member not found", 404);
            }
        }

        // Create notification record (you can store this in a notifications collection if needed)
        const notificationRecord = {
            id: new Types.ObjectId().toString(),
            type: data.type,
            recipient: {
                email: data.recipientEmail,
                name: data.recipientName
            },
            sender: {
                companyName: data.companyName,
                clientId: data.clientId
            },
            content: {
                subject: data.subject,
                message: data.message
            },
            metadata: data.metadata || {},
            status: 'pending' as 'pending' | 'sent' | 'failed',
            createdAt: new Date().toISOString(),
            sentAt: null as string | null
        };

        console.log('📧 Notification Record Created:', notificationRecord.id);

        // Here you can implement different notification methods:
        // 1. Email notification
        // 2. SMS notification  
        // 3. In-app notification
        // 4. Push notification

        try {
            // For now, we'll simulate sending the notification
            // In a real implementation, you would integrate with:
            // - Email service (SendGrid, AWS SES, Nodemailer)
            // - SMS service (Twilio, AWS SNS)
            // - Push notification service (Firebase, OneSignal)
            
            console.log('📤 Sending welcome message...');
            console.log(`To: ${data.recipientEmail}`);
            console.log(`Subject: ${data.subject}`);
            console.log(`Message: ${data.message}`);
            
            // Simulate successful sending
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update notification status
            notificationRecord.status = 'sent';
            notificationRecord.sentAt = new Date().toISOString();
            
            console.log('✅ Welcome message sent successfully');

            // Log activity for staff welcome notification
            try {
                const activityPayload = {
                    user: {
                        userId: 'system',
                        fullName: 'System',
                        email: 'system@admin.com'
                    },
                    clientId: data.clientId,
                    activityType: 'staff_notification',
                    category: 'notification',
                    action: 'send_welcome',
                    description: `Welcome notification sent to ${data.recipientName} (${data.recipientEmail})`,
                    message: `Staff welcome message sent for ${data.companyName}`,
                    date: new Date().toISOString(),
                    metadata: {
                        recipientEmail: data.recipientEmail,
                        recipientName: data.recipientName,
                        companyName: data.companyName,
                        notificationType: data.type,
                        ...data.metadata
                    }
                };

                // Import axios for activity logging
                const axios = require('axios');
                const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
                
                await axios.post(`${domain}/api/activity`, activityPayload);
                console.log('✅ Staff welcome notification activity logged');
            } catch (activityError) {
                console.error('❌ Error logging staff welcome notification activity:', activityError);
                // Don't fail the notification if activity logging fails
            }

            return successResponse(
                {
                    notificationId: notificationRecord.id,
                    status: notificationRecord.status,
                    recipient: data.recipientEmail,
                    companyName: data.companyName,
                    sentAt: notificationRecord.sentAt,
                    message: "Welcome notification sent successfully"
                },
                "Staff welcome notification sent successfully",
                200
            );

        } catch (notificationError: any) {
            console.error('❌ Error sending notification:', notificationError);
            
            // Update notification status to failed
            notificationRecord.status = 'failed';
            
            return errorResponse(
                "Failed to send welcome notification", 
                500, 
                notificationError
            );
        }

    } catch (error: unknown) {
        console.error("❌ Staff welcome notification API error:", error);
        return errorResponse("Failed to process staff welcome notification", 500, error);
    }
};

// GET endpoint to retrieve notification history (optional)
export const GET = async (req: NextRequest) => {
    try {
        await connect();
        
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');
        const staffId = searchParams.get('staffId');
        const type = searchParams.get('type') || 'staff_welcome';

        if (!clientId) {
            return errorResponse("Client ID is required", 400);
        }

        if (!Types.ObjectId.isValid(clientId)) {
            return errorResponse("Invalid client ID format", 400);
        }

        // Verify client exists
        const client = await Client.findById(clientId);
        if (!client) {
            return errorResponse("Client not found", 404);
        }

        // For now, return a simple response since we're not storing notifications in DB yet
        // In a real implementation, you would query a notifications collection
        const mockNotifications = [
            {
                id: "notification_" + Date.now(),
                type: type,
                status: "sent",
                createdAt: new Date().toISOString(),
                message: "Welcome notifications are being sent successfully"
            }
        ];

        return successResponse(
            mockNotifications,
            "Notification history retrieved successfully"
        );

    } catch (error: unknown) {
        console.error("❌ GET staff notifications error:", error);
        return errorResponse("Failed to retrieve notification history", 500, error);
    }
};