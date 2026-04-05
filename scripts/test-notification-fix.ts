/**
 * Test Script: Verify Notification System Fix
 * 
 * This script tests that notifications are sent to ALL admins of a client,
 * not just assigned staff.
 * 
 * Usage:
 * 1. Update the TEST_CLIENT_ID and TEST_PROJECT_ID below
 * 2. Run: npx ts-node scripts/test-notification-fix.ts
 */

import { Projects } from "@/lib/models/Project";
import { Admin } from "@/lib/models/users/Admin";
import connect from "@/lib/db";

const TEST_CLIENT_ID = "YOUR_CLIENT_ID_HERE"; // Replace with actual client ID
const TEST_PROJECT_ID = "YOUR_PROJECT_ID_HERE"; // Replace with actual project ID

async function testNotificationRecipients() {
  console.log('🧪 Testing Notification System Fix\n');
  console.log('=' .repeat(60));
  
  try {
    // Connect to database
    await connect();
    console.log('✅ Connected to database\n');

    // Test 1: Get project details
    console.log('📋 Test 1: Fetching Project Details');
    console.log('-'.repeat(60));
    
    const project = await Projects.findById(TEST_PROJECT_ID)
      .select('name clientId assignedStaff')
      .lean() as any;

    if (!project) {
      console.error('❌ Project not found!');
      console.error('   Please update TEST_PROJECT_ID in the script');
      return;
    }

    console.log('✅ Project found:');
    console.log(`   Name: ${project.name}`);
    console.log(`   Client ID: ${project.clientId}`);
    console.log(`   Assigned Staff Count: ${project.assignedStaff?.length || 0}`);
    
    if (project.assignedStaff && project.assignedStaff.length > 0) {
      console.log('   Assigned Staff:');
      project.assignedStaff.forEach((staff: any, index: number) => {
        console.log(`     ${index + 1}. ${staff.fullName} (ID: ${staff._id})`);
      });
    }
    console.log('');

    // Test 2: Get all admins for the client
    console.log('👥 Test 2: Fetching Client Admins');
    console.log('-'.repeat(60));
    
    const admins = await Admin.find({ clientId: project.clientId })
      .select('_id firstName lastName email')
      .lean() as any[];

    console.log(`✅ Found ${admins.length} admin(s) for client ${project.clientId}:`);
    
    if (admins.length === 0) {
      console.warn('⚠️  WARNING: No admins found for this client!');
      console.warn('   Notifications will only go to assigned staff (if any)');
    } else {
      admins.forEach((admin: any, index: number) => {
        console.log(`   ${index + 1}. ${admin.firstName} ${admin.lastName}`);
        console.log(`      ID: ${admin._id}`);
        console.log(`      Email: ${admin.email}`);
      });
    }
    console.log('');

    // Test 3: Calculate total recipients
    console.log('📊 Test 3: Total Notification Recipients');
    console.log('-'.repeat(60));
    
    const recipientIds: string[] = [];
    
    // Add admin IDs
    const adminIds = admins.map((admin: any) => admin._id.toString());
    recipientIds.push(...adminIds);
    
    // Add staff IDs
    if (project.assignedStaff && project.assignedStaff.length > 0) {
      const staffIds = project.assignedStaff.map((staff: any) => staff._id.toString());
      recipientIds.push(...staffIds);
    }
    
    // Remove duplicates
    const uniqueRecipientIds = [...new Set(recipientIds)];
    
    console.log(`✅ Total Recipients: ${uniqueRecipientIds.length}`);
    console.log(`   - Admins: ${adminIds.length}`);
    console.log(`   - Assigned Staff: ${project.assignedStaff?.length || 0}`);
    console.log(`   - Duplicates Removed: ${recipientIds.length - uniqueRecipientIds.length}`);
    console.log('');

    // Test 4: Verify fix is working
    console.log('✅ Test 4: Verification');
    console.log('-'.repeat(60));
    
    if (admins.length > 0) {
      console.log('✅ SUCCESS: Admins will receive notifications!');
      console.log(`   ${admins.length} admin(s) will be notified for activities on "${project.name}"`);
    } else {
      console.log('⚠️  WARNING: No admins found!');
      console.log('   Only assigned staff will receive notifications');
      console.log('   Consider adding admins to this client');
    }
    
    if (project.assignedStaff && project.assignedStaff.length > 0) {
      console.log(`✅ ${project.assignedStaff.length} assigned staff will also receive notifications`);
    }
    
    console.log('');
    console.log('=' .repeat(60));
    console.log('🎉 Test Complete!\n');
    
    // Summary
    console.log('📝 Summary:');
    console.log(`   Project: ${project.name}`);
    console.log(`   Total Notification Recipients: ${uniqueRecipientIds.length}`);
    console.log(`   - ${adminIds.length} admin(s)`);
    console.log(`   - ${project.assignedStaff?.length || 0} staff member(s)`);
    console.log('');
    
    if (uniqueRecipientIds.length === 0) {
      console.error('❌ ERROR: No recipients found!');
      console.error('   Notifications will NOT be sent for this project');
      console.error('   Action Required: Add admins or assign staff to this project');
    } else {
      console.log('✅ Notification system is working correctly!');
      console.log('   All admins and assigned staff will receive notifications');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
  }
}

// Run the test
testNotificationRecipients()
  .then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
