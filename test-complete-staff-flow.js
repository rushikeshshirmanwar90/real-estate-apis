const axios = require('axios');

// Test the complete staff addition and welcome message flow
const testCompleteStaffFlow = async () => {
    console.log('🔍 Testing Complete Staff Addition and Welcome Message Flow...\n');

    const domain = 'http://localhost:8080';
    const realClientId = '6941b27c7fdcea3d37e02ada';
    const companyName = 'Test Client Company';

    console.log(`Domain: ${domain}`);
    console.log(`Client ID: ${realClientId}`);
    console.log(`Company: ${companyName}\n`);

    // Step 1: Test the addStaff function endpoint (what the frontend calls)
    console.log('📝 Step 1: Testing staff addition via /api/users/staff...');
    
    const staffPayload = {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@testcompany.com",
        phoneNumber: "9876543210",
        role: "supervisor",
        clientId: realClientId
    };

    let addedStaff = null;

    try {
        const addStaffUrl = `${domain}/api/users/staff`;
        console.log(`URL: ${addStaffUrl}`);
        console.log('Payload:', JSON.stringify(staffPayload, null, 2));
        
        const staffResponse = await axios.post(addStaffUrl, staffPayload);
        console.log(`✅ Staff added successfully: ${staffResponse.status}`);
        console.log('Staff Response:', JSON.stringify(staffResponse.data, null, 2));
        
        addedStaff = staffResponse.data.data;
        console.log(`Staff ID: ${addedStaff._id}\n`);
        
    } catch (staffError) {
        console.error('❌ Error adding staff:', staffError.message);
        if (staffError.response) {
            console.error('Staff Response Status:', staffError.response.status);
            console.error('Staff Response Data:', JSON.stringify(staffError.response.data, null, 2));
        }
        return; // Exit if staff addition fails
    }

    // Step 2: Test welcome message with the actual staff data
    console.log('📧 Step 2: Testing welcome message with added staff...');
    
    const welcomeMessage = `Dear ${addedStaff.firstName} ${addedStaff.lastName},

Welcome to ${companyName}! 

We are excited to have you join our team as a ${addedStaff.role}. You have been successfully added to our construction management system.

Here's what you need to know:
• Your role: ${addedStaff.role}
• Company: ${companyName}
• Access: You can now log in to the system using your email address

Please contact your administrator if you have any questions or need assistance getting started.

We look forward to working with you!

Best regards,
${companyName} Team`;

    const welcomePayload = {
        recipientEmail: addedStaff.email,
        recipientName: `${addedStaff.firstName} ${addedStaff.lastName}`,
        subject: `Welcome to ${companyName} - You've been added as a staff member`,
        message: welcomeMessage,
        type: "staff_welcome",
        clientId: realClientId,
        staffId: addedStaff._id,
        companyName: companyName,
        metadata: {
            role: addedStaff.role,
            addedBy: "Administrator",
            addedAt: new Date().toISOString()
        }
    };

    try {
        const welcomeUrl = `${domain}/api/notifications/staff-welcome`;
        console.log(`URL: ${welcomeUrl}`);
        
        const welcomeResponse = await axios.post(welcomeUrl, welcomePayload);
        console.log(`✅ Welcome message sent successfully: ${welcomeResponse.status}`);
        console.log('Welcome Response:', JSON.stringify(welcomeResponse.data, null, 2));
        
    } catch (welcomeError) {
        console.error('❌ Welcome message error:', welcomeError.message);
        if (welcomeError.response) {
            console.error('Welcome Response Status:', welcomeError.response.status);
            console.error('Welcome Response Data:', JSON.stringify(welcomeError.response.data, null, 2));
        }
    }

    console.log('\n' + '='.repeat(60));

    // Step 3: Verify staff was added by fetching staff list
    console.log('\n📋 Step 3: Verifying staff was added by fetching staff list...');
    
    try {
        const staffListUrl = `${domain}/api/users/staff?clientId=${realClientId}`;
        console.log(`URL: ${staffListUrl}`);
        
        const listResponse = await axios.get(staffListUrl);
        console.log(`✅ Staff list retrieved: ${listResponse.status}`);
        
        const staffList = listResponse.data.data || [];
        console.log(`Found ${staffList.length} staff members:`);
        
        staffList.forEach((staff, index) => {
            console.log(`${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.email}) - ${staff.role}`);
        });
        
        // Check if our added staff is in the list
        const foundStaff = staffList.find(s => s._id === addedStaff._id);
        if (foundStaff) {
            console.log(`✅ Added staff found in list: ${foundStaff.firstName} ${foundStaff.lastName}`);
        } else {
            console.log('❌ Added staff not found in list');
        }
        
    } catch (listError) {
        console.error('❌ Error fetching staff list:', listError.message);
        if (listError.response) {
            console.error('List Response Status:', listError.response.status);
            console.error('List Response Data:', JSON.stringify(listError.response.data, null, 2));
        }
    }

    console.log('\n🎉 Complete staff flow test finished!');
};

// Run the test
testCompleteStaffFlow().catch(console.error);