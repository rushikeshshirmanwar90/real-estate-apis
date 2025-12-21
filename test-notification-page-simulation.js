const axios = require('axios');

// Simulate exactly what the notification page does
async function testNotificationPageSimulation() {
    console.log('\n========================================');
    console.log('🎭 SIMULATING NOTIFICATION PAGE BEHAVIOR');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    const clientId = '6941b27c7fdcea3d37e02ada'; // Fallback clientId
    
    try {
        console.log('\n1️⃣ Step 1: Simulating getClientId() function...');
        console.log('✅ Using clientId:', clientId);

        console.log('\n2️⃣ Step 2: Building API URLs (like notification page does)...');
        
        // Build API URLs with date-based pagination (exactly like notification page)
        const activityParams = new URLSearchParams({
            clientId,
            paginationMode: 'date',
            dateLimit: '10'
        });
        
        const materialParams = new URLSearchParams({
            clientId,
            paginationMode: 'date',
            dateLimit: '10'
        });

        const activityUrl = `${domain}/api/activity?${activityParams.toString()}`;
        const materialUrl = `${domain}/api/materialActivity?${materialParams.toString()}`;
        
        console.log('✅ Activity URL:', activityUrl);
        console.log('✅ Material URL:', materialUrl);

        console.log('\n3️⃣ Step 3: Making parallel API calls (like notification page does)...');
        
        // Fetch both activities in parallel with enhanced error handling (exactly like notification page)
        const [activityRes, materialActivityRes] = await Promise.all([
            axios.get(activityUrl)
                .catch((err) => {
                    console.error('❌ Activity API Error:', err?.response?.data || err.message);
                    console.error('❌ Activity API Status:', err?.response?.status);
                    // Return structure that matches successful response but indicates failure
                    return { 
                        data: { 
                            success: false, 
                            error: err?.response?.data?.message || err.message,
                            data: { dateGroups: [], hasMoreDates: false, nextDate: null } 
                        } 
                    };
                }),
            axios.get(materialUrl)
                .catch((err) => {
                    console.error('❌ Material Activity API Error:', err?.response?.data || err.message);
                    console.error('❌ Material Activity API Status:', err?.response?.status);
                    // Return structure that matches successful response but indicates failure
                    return { 
                        data: { 
                            success: false, 
                            error: err?.response?.data?.message || err.message,
                            data: { dateGroups: [], hasMoreDates: false, nextDate: null } 
                        } 
                    };
                }),
        ]);

        console.log('\n4️⃣ Step 4: Processing API responses (like notification page does)...');
        
        console.log('✅ Activity Response Success:', activityRes.data.success !== false);
        console.log('✅ Material Activity Response Success:', materialActivityRes.data.success !== false);
        
        // Check if both APIs failed
        if (activityRes.data.success === false && materialActivityRes.data.success === false) {
            console.error('❌ Both APIs failed');
            console.error('   Activity Error:', activityRes.data.error);
            console.error('   Material Error:', materialActivityRes.data.error);
            return;
        }

        const activityData = activityRes.data;
        const materialData = materialActivityRes.data;

        // Extract date groups from both APIs (exactly like notification page)
        const activityDateGroups = (activityData.success !== false) 
            ? (activityData.data?.dateGroups || activityData.dateGroups || [])
            : [];
        const materialDateGroups = (materialData.success !== false)
            ? (materialData.data?.dateGroups || materialData.dateGroups || [])
            : [];

        console.log('✅ Activity Date Groups:', activityDateGroups.length);
        console.log('✅ Material Date Groups:', materialDateGroups.length);

        console.log('\n5️⃣ Step 5: Checking fallback to traditional pagination...');
        
        // If no date groups found, try fallback to traditional pagination (like notification page)
        if (activityDateGroups.length === 0 && materialDateGroups.length === 0) {
            console.log('⚠️ No date groups found, falling back to traditional pagination...');
            
            // Try traditional pagination as fallback
            const [fallbackActivityRes, fallbackMaterialRes] = await Promise.all([
                axios.get(`${domain}/api/activity?clientId=${clientId}&limit=50`)
                    .catch((err) => {
                        console.error('❌ Fallback Activity API Error:', err?.response?.data || err.message);
                        return { data: { activities: [] } };
                    }),
                axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=50`)
                    .catch((err) => {
                        console.error('❌ Fallback Material API Error:', err?.response?.data || err.message);
                        return { data: [] };
                    }),
            ]);

            console.log('📦 Fallback API responses received');
            
            // Process fallback responses (exactly like notification page)
            const fallbackActivityData = fallbackActivityRes.data;
            const fallbackMaterialDataRaw = fallbackMaterialRes.data;

            // Handle different response formats for Activity API
            let activities = [];
            if (Array.isArray(fallbackActivityData)) {
                activities = fallbackActivityData;
            } else if (fallbackActivityData && typeof fallbackActivityData === 'object') {
                activities = (fallbackActivityData.data?.activities ||
                    fallbackActivityData.activities ||
                    fallbackActivityData.data ||
                    []);
            }

            // Handle different response formats for Material Activity API
            let materialData = [];
            if (Array.isArray(fallbackMaterialDataRaw)) {
                materialData = fallbackMaterialDataRaw;
            } else if (fallbackMaterialDataRaw && typeof fallbackMaterialDataRaw === 'object') {
                materialData = (fallbackMaterialDataRaw.data?.activities ||
                    fallbackMaterialDataRaw.materialActivities ||
                    fallbackMaterialDataRaw.activities ||
                    fallbackMaterialDataRaw.data ||
                    []);
            }

            console.log('📊 Fallback data extracted:');
            console.log('   - Activities:', activities.length);
            console.log('   - Materials:', materialData.length);

            if (activities.length === 0 && materialData.length === 0) {
                console.log('\n❌ NO ACTIVITIES FOUND IN FALLBACK');
                console.log('💡 This explains why the notification page is empty!');
                console.log('💡 Possible causes:');
                console.log('   1. No activities have been created yet');
                console.log('   2. Activities are being created with a different clientId');
                console.log('   3. There\'s an issue with the API endpoints');
                console.log('   4. The batch material usage API is not creating MaterialActivity records');
            } else {
                console.log('\n✅ ACTIVITIES FOUND IN FALLBACK');
                console.log('💡 The notification page should be showing activities');
                console.log('💡 If it\'s not, there might be a UI rendering issue');
            }

            return;
        }

        console.log('\n6️⃣ Step 6: Merging date groups (like notification page does)...');
        
        // Merge and sort date groups (exactly like notification page)
        const allDateGroups = {};

        // Add activity date groups
        activityDateGroups.forEach((group) => {
            if (!allDateGroups[group.date]) {
                allDateGroups[group.date] = [];
            }
            group.activities.forEach((activity) => {
                allDateGroups[group.date].push({ type: 'activity', data: activity, timestamp: activity.createdAt });
            });
        });

        // Add material date groups
        materialDateGroups.forEach((group) => {
            if (!allDateGroups[group.date]) {
                allDateGroups[group.date] = [];
            }
            group.activities.forEach((material) => {
                const timestamp = material.date || material.createdAt || new Date().toISOString();
                allDateGroups[group.date].push({ type: 'material', data: material, timestamp });
            });
        });

        // Convert to sorted array
        const sortedDates = Object.keys(allDateGroups).sort((a, b) => b.localeCompare(a));
        const newDateGroups = sortedDates.map(date => ({
            date,
            activities: allDateGroups[date].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            ),
            count: allDateGroups[date].length
        }));

        console.log('✅ Merged date groups:', newDateGroups.length);
        console.log('✅ Total activities across all dates:', newDateGroups.reduce((sum, group) => sum + group.count, 0));

        if (newDateGroups.length > 0) {
            console.log('\n📅 Date groups breakdown:');
            newDateGroups.forEach((group, index) => {
                const activityCount = group.activities.filter(item => item.type === 'activity').length;
                const materialCount = group.activities.filter(item => item.type === 'material').length;
                
                console.log(`   ${index + 1}. ${group.date}:`);
                console.log(`      - Total: ${group.count}`);
                console.log(`      - Regular activities: ${activityCount}`);
                console.log(`      - Material activities: ${materialCount}`);
            });
        }

        console.log('\n7️⃣ Step 7: Final analysis...');
        
        const totalActivities = newDateGroups.reduce((sum, group) => sum + group.count, 0);
        
        if (totalActivities === 0) {
            console.log('\n❌ NO ACTIVITIES TO DISPLAY');
            console.log('💡 This is why the notification page shows "No Activities Yet"');
            console.log('💡 To fix this:');
            console.log('   1. Use the material usage form in your app');
            console.log('   2. Make sure the batch API is creating MaterialActivity records');
            console.log('   3. Verify the clientId matches between creation and retrieval');
        } else {
            console.log('\n✅ ACTIVITIES READY FOR DISPLAY');
            console.log(`💡 Found ${totalActivities} activities across ${newDateGroups.length} dates`);
            console.log('💡 The notification page should be showing these activities');
            console.log('💡 If it\'s not showing them, check:');
            console.log('   - Browser console for JavaScript errors');
            console.log('   - Make sure you\'re on the correct tab (All/Materials/Used)');
            console.log('   - Try refreshing the notification page');
        }

    } catch (error) {
        console.error('\n❌ SIMULATION ERROR:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        console.error('URL:', error.config?.url);
    }

    console.log('\n========================================');
    console.log('🏁 NOTIFICATION PAGE SIMULATION COMPLETED');
    console.log('========================================\n');
}

// Run the simulation
testNotificationPageSimulation().catch(console.error);