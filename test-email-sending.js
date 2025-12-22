const axios = require('axios');

// Test the email sending functionality
const testEmailSending = async () => {
    console.log('🔍 Testing Email Sending Functionality...\n');

    const domain = 'http://localhost:8080';
    console.log(`Using domain: ${domain}\n`);

    // Test email payload
    const emailPayload = {
        email: "test.staff@example.com",
        staffName: "John Doe",
        companyName: "Test Client Company"
    };

    try {
        console.log('📧 Testing Email API...');
        const emailUrl = `${domain}/api/send-mail`;
        console.log(`URL: ${emailUrl}`);
        console.log('Payload:', JSON.stringify(emailPayload, null, 2));
        
        const response = await axios.post(emailUrl, emailPayload);
        console.log(`✅ Email API Status: ${response.status}`);
        console.log(`Email Response:`, JSON.stringify(response.data, null, 2));
        
        if (response.status === 200) {
            console.log('\n🎉 SUCCESS: Email sent successfully!');
            console.log('✅ The email API is working correctly');
            console.log('✅ Staff welcome emails should now work in the React Native app');
        } else {
            console.log('\n⚠️ Email API returned non-200 status');
        }
        
    } catch (error) {
        console.error('❌ Email API Error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Check if the email transporter is configured correctly');
        console.log('2. Verify SMTP settings in the environment variables');
        console.log('3. Check if the email template is rendering properly');
        console.log('4. Ensure the server has internet connectivity for sending emails');
    }

    console.log('\n' + '='.repeat(60));

    // Test with invalid data to see error handling
    console.log('\n🔍 Testing with invalid email data...');
    
    const invalidPayload = {
        email: "", // Empty email
        staffName: "Test User",
        companyName: "Test Company"
    };

    try {
        const response = await axios.post(`${domain}/api/send-mail`, invalidPayload);
        console.log(`Unexpected success: ${response.status}`);
        console.log(`Response:`, JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('✅ Expected error for invalid email:');
        if (error.response) {
            console.log('Response Status:', error.response.status);
            console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. If the email test passes, the React Native app should now send welcome emails');
    console.log('2. Add a staff member in the React Native app to test the complete flow');
    console.log('3. Check the staff member\'s email inbox for the welcome message');
    console.log('4. Monitor console logs for any issues during the process');
};

// Run the test
testEmailSending().catch(console.error);