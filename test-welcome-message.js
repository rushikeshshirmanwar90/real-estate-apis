const axios = require('axios');

// Test the welcome message functionality
const testWelcomeMessage = async () => {
    console.log('🔍 Testing Welcome Message Functionality...\n');

    const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:8080';
    console.log(`Using domain: ${domain}\n`);

    // Test notification payload
    const testPayload = {
        recipientEmail: "test.staff@example.com",
        recipientName: "Test Staff Member",
        subject: "Welcome to Test Company - You've been added as a staff member",
        message: `Dear Test Staff Member,

Welcome to Test Company! 

We are excited to have you join our team as a site-engineer. You have been successfully added to our construction management system.

Here's what you need to know:
• Your role: site-engineer
• Company: Test Company
• Access: You can now log in to the system using your email address

Please contact your administrator if you have any questions or need assistance getting started.

We look forward to working with you!

Best regards,
Test Company Team`,
        type: "staff_welcome",
        clientId: "676b8b8b8b8b8b8b8b8b8b8b", // Replace with actual clientId
        staffId: "676b8b8b8b8b8b8b8b8b8b8c", // Replace with actual staffId
        companyName: "Test Company",
        metadata: {
            role: "site-engineer",
            addedBy: "Administrator",
            addedAt: new Date().toISOString()
        }
    };

    try {
        console.log('📡 Testing Staff Welcome Notification API...');
        const welcomeUrl = `${domain}/api/notifications/staff-welcome`;
        console.log(`URL: ${welcomeUrl}`);
        console.log('Payload:', JSON.stringify(testPayload, null, 2));
        
        const response = await axios.post(welcomeUrl, testPayload);
        console.log(`✅ Welcome API Status: ${response.status}`);
        console.log(`Welcome Response:`, JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('❌ Welcome API Error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }

    console.log('\n' + '='.repeat(50));

    // Test with invalid data to see error handling
    console.log('\n🔍 Testing with invalid data...');
    
    const invalidPayload = {
        recipientEmail: "invalid-email",
        recipientName: "",
        clientId: "invalid-id"
    };

    try {
        const response = await axios.post(`${domain}/api/notifications/staff-welcome`, invalidPayload);
        console.log(`Unexpected success: ${response.status}`);
        console.log(`Response:`, JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('✅ Expected error for invalid data:');
        if (error.response) {
            console.log('Response Status:', error.response.status);
            console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }

    console.log('\n' + '='.repeat(50));

    // Test GET endpoint
    console.log('\n🔍 Testing GET notification history...');
    
    try {
        const getUrl = `${domain}/api/notifications/staff-welcome?clientId=676b8b8b8b8b8b8b8b8b8b8b&type=staff_welcome`;
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
testWelcomeMessage().catch(console.error);