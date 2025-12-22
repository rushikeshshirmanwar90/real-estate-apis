const axios = require('axios');

async function testCompleteVerificationFlow() {
    try {
        console.log('🧪 Testing Complete Email Verification Flow...\n');
        
        const testEmail = 'test@example.com';
        const staffName = 'John Doe';
        const companyName = 'Test Company';
        
        // Step 1: Send OTP
        console.log('📧 Step 1: Sending OTP...');
        const otpPayload = {
            email: testEmail,
            staffName: staffName,
            companyName: companyName
        };
        
        const otpResponse = await axios.post('http://localhost:8080/api/send-otp', otpPayload);
        console.log('✅ OTP Response Status:', otpResponse.status);
        console.log('✅ OTP Response:', JSON.stringify(otpResponse.data, null, 2));
        
        if (!otpResponse.data.success) {
            throw new Error('Failed to send OTP');
        }
        
        const generatedOTP = otpResponse.data.otp;
        console.log('🔢 Generated OTP:', generatedOTP);
        
        // Step 2: Verify OTP
        console.log('\n🔐 Step 2: Verifying OTP...');
        const verifyPayload = {
            email: testEmail,
            otp: generatedOTP
        };
        
        const verifyResponse = await axios.post('http://localhost:8080/api/verify-otp', verifyPayload);
        console.log('✅ Verify Response Status:', verifyResponse.status);
        console.log('✅ Verify Response:', JSON.stringify(verifyResponse.data, null, 2));
        
        if (!verifyResponse.data.success) {
            throw new Error('Failed to verify OTP');
        }
        
        console.log('\n🎉 Complete verification flow successful!');
        console.log('✅ Email verification is working correctly');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error in verification flow:', error.message);
        if (error.response) {
            console.error('❌ Error Status:', error.response.status);
            console.error('❌ Error Data:', error.response.data);
        }
        return false;
    }
}

testCompleteVerificationFlow();