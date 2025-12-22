const axios = require('axios');

// Test the send-otp endpoint directly
const testSendOTPDirect = async () => {
    console.log('🔍 Testing /api/send-otp endpoint directly...\n');

    const domain = 'http://localhost:8080';
    const url = `${domain}/api/send-otp`;
    
    const payload = {
        email: "direct.test@example.com",
        staffName: "Direct Test",
        companyName: "Test Company"
    };

    console.log(`URL: ${url}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(url, payload);
        console.log(`✅ Response Status: ${response.status}`);
        console.log('Response Headers:', response.headers);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));
        
        // Check what properties are in the response
        console.log('\n📊 Response Analysis:');
        console.log('Has success property:', 'success' in response.data);
        console.log('Has message property:', 'message' in response.data);
        console.log('Has otp property:', 'otp' in response.data);
        console.log('Has messageId property:', 'messageId' in response.data);
        
        if (response.data.success) {
            console.log('✅ Success property is true');
        } else if (response.data.message) {
            console.log('✅ Message property exists:', response.data.message);
        } else {
            console.log('⚠️ Neither success nor message property found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
};

// Run the test
testSendOTPDirect().catch(console.error);