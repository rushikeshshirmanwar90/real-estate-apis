const axios = require('axios');

// Simulate the exact flow that happens in the React Native app
const debugFrontendFlow = async () => {
    console.log('🔍 Debugging Frontend Flow (React Native App Simulation)...\n');

    // This simulates what happens in the React Native app
    const domain = 'http://10.44.43.135:8080'; // The domain from Xsite/lib/domain.ts
    const realClientId = '6941b27c7fdcea3d37e02ada';
    const companyName = 'Test Client Company';

    console.log(`Domain (from React Native): ${domain}`);
    console.log(`Client ID: ${realClientId}`);
    console.log(`Company: ${companyName}\n`);

    // Step 1: Test if the React Native app can reach the server
    console.log('🌐 Step 1: Testing server connectivity from React Native domain...');
    
    try {
        const healthUrl = `${domain}/api/users/staff?clientId=${realClientId}`;
        console.log(`Testing connectivity: ${healthUrl}`);
        
        const response = await axios.get(healthUrl, { timeout: 5000 });
        console.log(`✅ Server is reachable: ${response.status}`);
        console.log(`Staff count: ${response.data.data?.length || 0}`);
        
    } catch (connectError) {
        console.error('❌ Server connectivity issue:', connectError.message);
        console.error('This might be why the React Native app cannot send welcome messages');
        
        if (connectError.code === 'ECONNREFUSED') {
            console.error('🔧 Solution: Make sure the server is running and accessible from the React Native device');
        } else if (connectError.code === 'ETIMEDOUT') {
            console.error('🔧 Solution: Check network connectivity and firewall settings');
        }
        
        // Try with localhost instead
        console.log('\n🔄 Trying with localhost...');
        try {
            const localhostDomain = 'http://localhost:8080';
            const localhostUrl = `${localhostDomain}/api/users/staff?clientId=${realClientId}`;
            console.log(`Testing with localhost: ${localhostUrl}`);
            
            const localhostResponse = await axios.get(localhostUrl, { timeout: 5000 });
            console.log(`✅ Localhost works: ${localhostResponse.status}`);
            console.log('🔧 Solution: Update the domain in Xsite/lib/domain.ts to use localhost or the correct IP');
            
        } catch (localhostError) {
            console.error('❌ Localhost also failed:', localhostError.message);
        }
        
        return;
    }

    // Step 2: Test staff addition with React Native domain
    console.log('\n📝 Step 2: Testing staff addition with React Native domain...');
    
    const staffPayload = {
        firstName: "React",
        lastName: "Native",
        email: "react.native@testcompany.com",
        phoneNumber: "5555555555",
        role: "manager",
        clientId: realClientId
    };

    let addedStaff = null;

    try {
        const addStaffUrl = `${domain}/api/users/staff`;
        console.log(`URL: ${addStaffUrl}`);
        
        const staffResponse = await axios.post(addStaffUrl, staffPayload, { timeout: 10000 });
        console.log(`✅ Staff added via React Native domain: ${staffResponse.status}`);
        
        addedStaff = staffResponse.data.data;
        console.log(`Staff ID: ${addedStaff._id}`);
        
    } catch (staffError) {
        console.error('❌ Error adding staff via React Native domain:', staffError.message);
        if (staffError.response) {
            console.error('Response Status:', staffError.response.status);
            console.error('Response Data:', JSON.stringify(staffError.response.data, null, 2));
        }
        return;
    }

    // Step 3: Test welcome message with React Native domain
    console.log('\n📧 Step 3: Testing welcome message with React Native domain...');
    
    const welcomePayload = {
        recipientEmail: addedStaff.email,
        recipientName: `${addedStaff.firstName} ${addedStaff.lastName}`,
        subject: `Welcome to ${companyName} - You've been added as a staff member`,
        message: `Dear ${addedStaff.firstName} ${addedStaff.lastName},\n\nWelcome to ${companyName}!...`,
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
        
        const welcomeResponse = await axios.post(welcomeUrl, welcomePayload, { timeout: 10000 });
        console.log(`✅ Welcome message sent via React Native domain: ${welcomeResponse.status}`);
        console.log('Welcome Response:', JSON.stringify(welcomeResponse.data, null, 2));
        
        console.log('\n🎉 SUCCESS: The complete flow works with the React Native domain!');
        console.log('🔧 If the React Native app still has issues, check:');
        console.log('   1. Network connectivity from the device/emulator');
        console.log('   2. Firewall settings');
        console.log('   3. Console logs in the React Native app');
        console.log('   4. Make sure the server IP is accessible from the device');
        
    } catch (welcomeError) {
        console.error('❌ Welcome message error via React Native domain:', welcomeError.message);
        if (welcomeError.response) {
            console.error('Response Status:', welcomeError.response.status);
            console.error('Response Data:', JSON.stringify(welcomeError.response.data, null, 2));
        }
        
        console.log('\n🔧 Troubleshooting steps:');
        console.log('   1. Check if the server is accessible from the React Native device');
        console.log('   2. Verify the IP address in Xsite/lib/domain.ts is correct');
        console.log('   3. Check network connectivity and firewall settings');
        console.log('   4. Look at React Native console logs for more details');
    }
};

// Run the debug
debugFrontendFlow().catch(console.error);