const axios = require('axios');

// Test script to verify material activity logging
async function testMaterialActivityLogging() {
    console.log('\n========================================');
    console.log('🧪 TESTING MATERIAL ACTIVITY LOGGING');
    console.log('========================================');

    const baseURL = 'http://localhost:3000';
    
    // Your actual IDs
    const projectId = '6947d14206f922bb666c9dae';
    const clientId = '6947ca5feb038ceeb22be7ee';

    try {
        console.log('\n📋 TEST PARAMETERS:');
        console.log('  - Project ID:', projectId);
        console.log('  - Client ID:', clientId);

        // Step 1: Add a test material
        console.log('\n🔨 STEP 1: Adding test material...');
        
        const testMaterial = {
            projectId: projectId,
            materialName: 'Test Activity Material',
            unit: 'bags',
            specs: { grade: 'Test Grade' },
            qnt: 50,
            cost: 300,
            mergeIfExists: false
        };

        const addMaterialResponse = await axios.post(`${baseURL}/api/material`, [testMaterial]);
        
        if (!addMaterialResponse.data.success) {
            console.error('❌ Failed to add material:', addMaterialResponse.data);
            return;
        }

        console.log('✅ Material added successfully');
        console.log('Response:', JSON.stringify(addMaterialResponse.data, null, 2));

        // Step 2: Check if MaterialActivity was created
        console.log('\n📊 STEP 2: Checking MaterialActivity records...');
        
        const activityResponse = await axios.get(`${baseURL}/api/materialActivity?projectId=${projectId}&clientId=${clientId}&activity=imported`);
        
        if (!activityResponse.data.success) {
            console.error('❌ Failed to fetch material activities:', activityResponse.data);
            return;
        }

        console.log('✅ Material activities fetched successfully');
        
        const activities = activityResponse.data.activities || activityResponse.data.dateGroups || [];
        console.log('Activities found:', activities.length);

        if (activities.length > 0) {
            console.log('\n📋 RECENT MATERIAL ACTIVITIES:');
            
            // Handle both pagination modes
            if (activityResponse.data.dateGroups) {
                // Date-based pagination
                activityResponse.data.dateGroups.forEach((dateGroup, index) => {
                    console.log(`  Date Group ${index + 1}: ${dateGroup.date} (${dateGroup.count} activities)`);
                    dateGroup.activities.slice(0, 3).forEach((activity, actIndex) => {
                        console.log(`    ${actIndex + 1}. Activity by ${activity.user?.fullName || 'Unknown'}`);
                        console.log(`       - Materials: ${activity.materials?.length || 0}`);
                        console.log(`       - Activity: ${activity.activity}`);
                        console.log(`       - Message: ${activity.message || 'No message'}`);
                        console.log(`       - Date: ${activity.date || activity.createdAt}`);
                        
                        if (activity.materials && activity.materials.length > 0) {
                            console.log(`       - Sample material: ${activity.materials[0].name} (${activity.materials[0].qnt} ${activity.materials[0].unit})`);
                        }
                    });
                });
            } else {
                // Traditional pagination
                activities.slice(0, 5).forEach((activity, index) => {
                    console.log(`  ${index + 1}. Activity by ${activity.user?.fullName || 'Unknown'}`);
                    console.log(`     - Materials: ${activity.materials?.length || 0}`);
                    console.log(`     - Activity: ${activity.activity}`);
                    console.log(`     - Message: ${activity.message || 'No message'}`);
                    console.log(`     - Date: ${activity.date || activity.createdAt}`);
                    
                    if (activity.materials && activity.materials.length > 0) {
                        console.log(`     - Sample material: ${activity.materials[0].name} (${activity.materials[0].qnt} ${activity.materials[0].unit})`);
                    }
                });
            }

            console.log('\n🎉 SUCCESS! Material activity logging is working.');
            console.log('Your notifications/activity feed should show these activities.');
        } else {
            console.log('\n❌ NO ACTIVITIES FOUND!');
            console.log('This suggests material activity logging is not working.');
            console.log('Possible issues:');
            console.log('1. Activity logging failed silently');
            console.log('2. Wrong projectId or clientId');
            console.log('3. MaterialActivity API has issues');
        }

        // Step 3: Test direct MaterialActivity creation
        console.log('\n🧪 STEP 3: Testing direct MaterialActivity creation...');
        
        const directActivityPayload = {
            clientId: clientId,
            projectId: projectId,
            materials: [{
                name: 'Direct Test Material',
                unit: 'pieces',
                specs: { type: 'test' },
                qnt: 10,
                cost: 100,
                addedAt: new Date()
            }],
            message: 'Direct activity test',
            activity: 'imported',
            user: {
                userId: 'test-user',
                fullName: 'Test User'
            },
            date: new Date().toISOString()
        };

        const directActivityResponse = await axios.post(`${baseURL}/api/materialActivity`, directActivityPayload);
        
        if (directActivityResponse.data.success) {
            console.log('✅ Direct MaterialActivity creation successful');
            console.log('Response:', JSON.stringify(directActivityResponse.data, null, 2));
        } else {
            console.log('❌ Direct MaterialActivity creation failed');
            console.log('Error:', directActivityResponse.data);
        }

        // Step 4: Final activity check
        console.log('\n📊 STEP 4: Final activity check...');
        
        const finalActivityResponse = await axios.get(`${baseURL}/api/materialActivity?projectId=${projectId}&clientId=${clientId}`);
        
        if (finalActivityResponse.data.success) {
            const finalActivities = finalActivityResponse.data.activities || finalActivityResponse.data.dateGroups || [];
            console.log(`✅ Final check: ${finalActivities.length} activities found`);
            
            if (finalActivities.length > 0) {
                console.log('\n🎯 DIAGNOSIS: Material activity logging is working!');
                console.log('If you\'re not seeing activities in your app:');
                console.log('1. Check if the app is fetching from the correct API endpoint');
                console.log('2. Verify the projectId and clientId match');
                console.log('3. Check if the notification component is filtering correctly');
                console.log('4. Clear your app cache and restart');
            }
        }

    } catch (error) {
        console.error('\n❌ TEST ERROR:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
        
        console.error('\nPossible issues:');
        console.error('1. Server is not running');
        console.error('2. Database connection issues');
        console.error('3. Invalid project/client IDs');
        console.error('4. MaterialActivity API has errors');
    }

    console.log('\n========================================');
    console.log('🧪 MATERIAL ACTIVITY TEST COMPLETED');
    console.log('========================================\n');
}

// Run the test
testMaterialActivityLogging().catch(console.error);