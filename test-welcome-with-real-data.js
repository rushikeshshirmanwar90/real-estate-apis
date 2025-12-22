const axios = require('axios');

// Test welcome message with real client data
const testWelcomeWithRealData = async () => {
    console.log('🔍 Testing Welcome Message with Real Data...\n');

    const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:8080';
    const realClientId = '6941b27c7fdcea3d37e02ada'; // Real client ID from database
    const companyName = 'Test Client Company';

    console.log(`Using domain: ${domain}`);
    console.log(`Client ID: ${realClientId}`);
    console.log(`Company: ${companyName}\n`);

    // First, let's add a test staff member
    console.log('📝 Adding a test staff member first...');
    
    const staffPayload = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@testcompany.com",
        phoneNumber: "1234567890",
        role: "site-engineer",
        clientId: realClientId
    };

    let staffId = null;

    try {
        const addStaffUrl = `${domain}/api/users/staff`;
        console.log(`Adding staff via: ${addStaffUrl}`);
        
        const staffResponse = await axios.post(addStaffUrl, staffPayload);
        console.log(`✅ Staff added successfully: ${staffResponse.status}`);
        console.log('Staff Response:', JSON.stringify(staffResponse.data, null, 2));
        
        staffId = staffResponse.data.data._id;
        console.log(`Staff ID: ${staffId}\n`);
        
    } catch (staffError) {
        console.error('❌ Error adding staff:', staffError.message);
        if (staffError.response) {
            console.error('Staff Response Status:', staffError.response.status);
            console.error('Staff Response Data:', JSON.stringify(staffError.response.data, null, 2));
        }
        console.log('Continuing with welcome message test anyway...\n');
    }

    // Now test the welcome message
    console.log('📧 Testing welcome message...');
    
    const welcomePayload = {
        recipientEmail: staffPayload.email,
        recipientName: `${staffPayload.firstName} ${staffPayload.lastName}`,
        subject: `Welcome to ${companyName} - You've been added as a staff member`,
        message: `Dear ${staffPayload.firstName} ${staffPayload.lastName},

Welcome to ${companyName}! 

We are excited to have you join our team as a ${staffPayload.role}. You have been successfully added to our construction management system.

Here's what you need to know:
• Your role: ${staffPayload.role}
• Company: ${companyName}
• Access: You can now log in to the system using your email address

Please contact your administrator if you have any questions or need assistance getting started.

We look forward to working with you!

Best regards,
${companyName} Team`,
        type: "staff_welcome",
        clientId: realClientId,
        staffId: staffId,
        companyName: companyName,
        metadata: {
            role: staffPayload.role,
            addedBy: "Administrator",
            addedAt: new Date().toISOString()
        }
    };

    try {
        const welcomeUrl = `${domain}/api/notifications/staff-welcome`;
        console.log(`Sending welcome message via: ${welcomeUrl}`);
        
        const response = await axios.post(welcomeUrl, welcomePayload);
        console.log(`✅ Welcome message sent successfully: ${response.status}`);
        console.log('Welcome Response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('❌ Welcome message error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }

    console.log('\n' + '='.repeat(50));

    // Test GET endpoint with real client ID
    console.log('\n🔍 Testing GET notification history with real client ID...');
    
    try {
        const getUrl = `${domain}/api/notifications/staff-welcome?clientId=${realClientId}&type=staff_welcome`;
        console.log(`URL: ${getUrl}`);
        
        const response = await axios.get(getUrl);
        console.log(`✅ GET Status: ${response.status}`);
        console.log(`GET Response:`, JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('❌ GET Error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
};

// Run the test
testWelcomeWithRealData().catch(console.error);