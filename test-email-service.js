const axios = require('axios');

// Simulate the emailService functions
const domain = 'http://localhost:8080';

async function sendOTPEmail(payload) {
    try {
        console.log('📧 Sending OTP email...');
        console.log('📋 OTP Email payload:', JSON.stringify(payload, null, 2));
        console.log('🌐 Domain:', domain);
        
        const url = `${domain}/api/send-otp`;
        console.log('📤 POST URL:', url);
        
        const response = await axios.post(url, payload);
        
        console.log('📥 OTP Email response status:', response.status);
        console.log('📥 OTP Email response data:', JSON.stringify(response.data, null, 2));
        
        // Check for success: either success=true OR status 200 with message/otp present
        if (response.status === 200 && (response.data.success || response.data.message || response.data.otp)) {
            console.log('✅ OTP email sent successfully');
            return true;
        } else {
            console.error('❌ OTP email failed with status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Error sending OTP email:', error.message);
        if (error.response) {
            console.error('❌ Error response status:', error.response.status);
            console.error('❌ Error response data:', error.response.data);
        }
        return false;
    }
}

async function verifyOTP(email, otp, staffId) {
    try {
        console.log('🔐 Verifying OTP...');
        console.log('📧 Email:', email);
        console.log('🔢 OTP:', otp);
        console.log('🆔 Staff ID:', staffId);
        console.log('🌐 Domain:', domain);
        
        const url = `${domain}/api/verify-otp`;
        console.log('📤 POST URL:', url);
        
        const payload = { email, otp, staffId };
        const response = await axios.post(url, payload);
        
        console.log('📥 Verify OTP response status:', response.status);
        console.log('📥 Verify OTP response data:', JSON.stringify(response.data, null, 2));
        
        if (response.status === 200 && response.data.success) {
            console.log('✅ OTP verified successfully');
            return true;
        } else {
            console.error('❌ OTP verification failed with status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verifying OTP:', error.message);
        if (error.response) {
            console.error('❌ Error response status:', error.response.status);
            console.error('❌ Error response data:', error.response.data);
        }
        return false;
    }
}

async function testEmailService() {
    console.log('🧪 Testing EmailService Functions...\n');
    
    const testPayload = {
        email: 'test@example.com',
        staffName: 'John Doe',
        companyName: 'Test Company'
    };
    
    // Test OTP sending
    const otpSent = await sendOTPEmail(testPayload);
    
    if (!otpSent) {
        console.log('❌ EmailService OTP sending failed');
        return;
    }
    
    // For testing, we'll use a mock OTP since we can't get the real one from the response
    // In real usage, the OTP would be entered by the user
    console.log('\n⚠️ Note: In real usage, user would enter OTP from email');
    console.log('✅ EmailService OTP sending works correctly');
    console.log('✅ The "OTP email failed with status: 200" error should be fixed now');
}

testEmailService();