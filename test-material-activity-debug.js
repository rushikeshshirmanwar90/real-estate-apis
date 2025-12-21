const axios = require('axios');

// Debug material activity logging and fetching
async function debugMaterialActivityFlow() {
    console.log('\n========================================');
    console.log('🔍 DEBUGGING MATERIAL ACTIVITY FLOW');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    
    try {
        // Step 1: Check if MaterialActivity API is working
        console.log('\n1️⃣ Testing MaterialActivity API directly...');
        
        // First, let's see what's currently in the MaterialActivity collection
        const existingActivitiesRes = await axios.get(`${domain}/api/materialActivity?limit=10`);
        console.log('✅ MaterialActivity API Response Status:', existingActivitiesRes.status);
        console.log('✅ Response Structure:', Object.keys(existingActivitiesRes.data));
        
        if (existingActivitiesRes.data.data?.activities) {
            console.log('✅ Found activities:', existingActivitiesRes.data.data.activities.length);
            existingActivitiesRes.data.data.activities.forEach((activity, index) => {
                console.log(`   ${index + 1}. Activity: ${activity.activity} - Materials: ${activity.materials.length} - User: ${activity.user.fullName}`);
            });
        } else if (Array.isArray(existingActivitiesRes.data)) {
            console.log('✅ Found activities (array format):', existingActivitiesRes.data.length);
            existingActivitiesRes.data.forEach((activity, index) => {
                console.log(`   ${index + 1}. Activity: ${activity.activity} - Materials: ${activity.materials.length} - User: ${activity.user.fullName}`);
            });
        } else {
            console.log('⚠️ No activities found or unexpected format');
            console.log('Response data:', JSON.stringify(existingActivitiesRes.data, null, 2));
        }

        // Step 2: Create a test MaterialActivity directly
        console.log('\n2️⃣ Creating test MaterialActivity...');
        
        const testActivity = {
            clientId: '6756b8b4b0b5b4b5b4b5b4b8', // Replace with actual clientId
            projectId: '6756b8b4b0b5b4b5b4b5b4b5', // Replace with actual projectId
            materials: [
                {
                    name: 'Test Cement',
                    unit: 'bags',
                    specs: { grade: 'OPC 43' },
                    qnt: 10,
                    cost: 500
                },
                {
                    name: 'Test Bricks',
                    unit: 'pieces',
                    specs: { type: 'red' },
                    qnt: 100,
                    cost: 1000
                }
            ],
            message: 'Test material usage from debug script',
            activity: 'used',
            user: {
                userId: 'test-user-123',
                fullName: 'Test User'
            },
            date: new Date().toISOString()
        };

        const createRes = await axios.post(`${domain}/api/materialActivity`, testActivity);
        console.log('✅ Created test activity:', createRes.status);
        console.log('✅ Created activity ID:', createRes.data.data._id);

        // Step 3: Verify the activity was created
        console.log('\n3️⃣ Verifying activity was created...');
        
        const verifyRes = await axios.get(`${domain}/api/materialActivity?limit=5`);
        console.log('✅ Verification response status:', verifyRes.status);
        
        const activities = verifyRes.data.data?.activities || verifyRes.data || [];
        const latestActivity = activities[0];
        
        if (latestActivity) {
            console.log('✅ Latest activity found:');
            console.log('   - ID:', latestActivity._id);
            console.log('   - Activity:', latestActivity.activity);
            console.log('   - User:', latestActivity.user.fullName);
            console.log('   - Materials:', latestActivity.materials.length);
            console.log('   - Message:', latestActivity.message);
            console.log('   - Date:', latestActivity.date);
        } else {
            console.log('❌ No activities found after creation');
        }

        // Step 4: Test with clientId filter (like notification page does)
        console.log('\n4️⃣ Testing with clientId filter...');
        
        const clientFilterRes = await axios.get(`${domain}/api/materialActivity?clientId=${testActivity.clientId}&limit=5`);
        console.log('✅ Client filter response status:', clientFilterRes.status);
        
        const clientActivities = clientFilterRes.data.data?.activities || clientFilterRes.data || [];
        console.log('✅ Activities for client:', clientActivities.length);
        
        if (clientActivities.length > 0) {
            console.log('✅ Client-filtered activities:');
            clientActivities.forEach((activity, index) => {
                console.log(`   ${index + 1}. ${activity.activity} - ${activity.materials.length} materials - ${activity.user.fullName}`);
            });
        }

        // Step 5: Test date-based pagination (like notification page uses)
        console.log('\n5️⃣ Testing date-based pagination...');
        
        const datePaginationRes = await axios.get(`${domain}/api/materialActivity?clientId=${testActivity.clientId}&paginationMode=date&dateLimit=10`);
        console.log('✅ Date pagination response status:', datePaginationRes.status);
        console.log('✅ Date pagination response structure:', Object.keys(datePaginationRes.data));
        
        if (datePaginationRes.data.data?.dateGroups) {
            console.log('✅ Date groups found:', datePaginationRes.data.data.dateGroups.length);
            datePaginationRes.data.data.dateGroups.forEach((group, index) => {
                console.log(`   Date ${index + 1}: ${group.date} - ${group.activities.length} activities`);
            });
        } else {
            console.log('⚠️ No date groups found');
            console.log('Response:', JSON.stringify(datePaginationRes.data, null, 2));
        }

    } catch (error) {
        console.error('\n❌ ERROR OCCURRED:');
        console.error('Error:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
        console.error('URL:', error.config?.url);
    }

    console.log('\n========================================');
    console.log('🏁 DEBUG COMPLETED');
    console.log('========================================\n');
}

// Run the debug
debugMaterialActivityFlow().catch(console.error);