const axios = require('axios');

async function testSendOTP() {
    try {
        console.log('🧪 Testing /api/send-otp endpoint...');
        
        const payload = {
            email: 'test@example.com',
            staffName: 'John Doe',
            companyName: 'Test Company'
        };
        
        console.log('📤 Sending request with payload:', JSON.stringify(payload, null, 2));
        
        const response = await axios.post('http://localhost:8080/api/send-otp', payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Response Status:', response.status);
        console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
        
        // Check if response has expected format
        const { success, message, otp, info } = response.data;
        
        console.log('\n📋 Response Analysis:');
        console.log('   success:', success);
        console.log('   message:', message);
        console.log('   otp:', otp);
        console.log('   info:', info);
        
        if (success && message && otp) {
            console.log('✅ API response format is correct!');
            return true;
        } else {
            console.log('❌ API response format issue detected');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error testing send-otp:', error.message);
        if (error.response) {
            console.error('❌ Error Status:', error.response.status);
            console.error('❌ Error Data:', error.response.data);
        }
        return false;
    }
}

testSendOTP();