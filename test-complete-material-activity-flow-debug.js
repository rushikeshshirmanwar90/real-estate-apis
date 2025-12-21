const axios = require('axios');

// Test the complete material activity flow from batch API to notification display
async function testCompleteFlow() {
    console.log('\n🔍 COMPREHENSIVE MATERIAL ACTIVITY FLOW DEBUG');
    console.log('='.repeat(60));
    
    const domain = 'http://localhost:8080';
    const clientId = '6941b27c7fdcea3d37e02ada';
    
    try {
        // 1. Test MaterialActivity API directly
        console.log('\n1️⃣ TESTING MATERIALACTIVITY API DIRECTLY');
        console.log('-'.repeat(40));
        
        const materialActivityUrl = `${domain}/api/materialActivity?clientId=${clientId}&paginationMode=date&dateLimit=5`;
        console.log('URL:', materialActivityUrl);
        
        const materialResponse = await axios.get(materialActivityUrl);
        console.log('✅ MaterialActivity API Response Status:', materialResponse.status);
        console.log('✅ Response Success:', materialResponse.data.success);
        console.log('✅ Response Structure:', Object.keys(materialResponse.data));
        
        if (materialResponse.data.data) {
            console.log('✅ Data Structure:', Object.keys(materialResponse.data.data));
            console.log('✅ Date Groups Count:', materialResponse.data.data.dateGroups?.length || 0);
            console.log('✅ Total Activities:', materialResponse.data.data.totalActivities || 0);
            
            if (materialResponse.data.data.dateGroups?.length > 0) {
                console.log('\n📅 DATE GROUPS BREAKDOWN:');
                materialResponse.data.data.dateGroups.forEach((group, index) => {
                    console.log(`   Group ${index + 1}: ${group.date} (${group.count} activities)`);
                    
                    // Show first activity in each group
                    if (group.activities?.length > 0) {
                        const firstActivity = group.activities[0];
                        console.log(`     Sample Activity:`);
                        console.log(`       - ID: ${firstActivity._id}`);
                        console.log(`       - Activity: ${firstActivity.activity}`);
                        console.log(`       - Materials: ${firstActivity.materials?.length || 0}`);
                        console.log(`       - User: ${firstActivity.user?.fullName || 'Unknown'}`);
                        console.log(`       - Date: ${firstActivity.date || firstActivity.createdAt}`);
                        console.log(`       - Message: ${firstActivity.message || 'No message'}`);
                    }
                });
            } else {
                console.log('❌ NO DATE GROUPS FOUND!');
            }
        }
        
        // 2. Test traditional pagination as fallback
        console.log('\n2️⃣ TESTING TRADITIONAL PAGINATION FALLBACK');
        console.log('-'.repeat(40));
        
        const traditionalUrl = `${domain}/api/materialActivity?clientId=${clientId}&limit=10`;
        console.log('URL:', traditionalUrl);
        
        const traditionalResponse = await axios.get(traditionalUrl);
        console.log('✅ Traditional API Response Status:', traditionalResponse.status);
        console.log('✅ Response Success:', traditionalResponse.data.success);
        
        if (traditionalResponse.data.data?.activities) {
            console.log('✅ Traditional Activities Count:', traditionalResponse.data.data.activities.length);
            
            if (traditionalResponse.data.data.activities.length > 0) {
                console.log('\n📋 TRADITIONAL ACTIVITIES BREAKDOWN:');
                traditionalResponse.data.data.activities.slice(0, 3).forEach((activity, index) => {
                    console.log(`   Activity ${index + 1}:`);
                    console.log(`     - ID: ${activity._id}`);
                    console.log(`     - Activity: ${activity.activity}`);
                    console.log(`     - Materials: ${activity.materials?.length || 0}`);
                    console.log(`     - User: ${activity.user?.fullName || 'Unknown'}`);
                    console.log(`     - Date: ${activity.date || activity.createdAt}`);
                    console.log(`     - Message: ${activity.message || 'No message'}`);
                });
            }
        } else {
            console.log('❌ NO TRADITIONAL ACTIVITIES FOUND!');
        }
        
        // 3. Test Activity API for comparison
        console.log('\n3️⃣ TESTING ACTIVITY API FOR COMPARISON');
        console.log('-'.repeat(40));
        
        const activityUrl = `${domain}/api/activity?clientId=${clientId}&paginationMode=date&dateLimit=5`;
        console.log('URL:', activityUrl);
        
        try {
            const activityResponse = await axios.get(activityUrl);
            console.log('✅ Activity API Response Status:', activityResponse.status);
            console.log('✅ Activity Date Groups Count:', activityResponse.data.data?.dateGroups?.length || 0);
            console.log('✅ Activity Total Activities:', activityResponse.data.data?.totalActivities || 0);
        } catch (activityError) {
            console.log('❌ Activity API Error:', activityError.response?.status, activityError.response?.data?.message || activityError.message);
        }
        
        // 4. Test the notification page simulation
        console.log('\n4️⃣ SIMULATING NOTIFICATION PAGE LOGIC');
        console.log('-'.repeat(40));
        
        // Simulate the exact logic from notification page
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
        
        console.log('Simulating parallel API calls...');
        
        const [activityRes, materialActivityRes] = await Promise.all([
            axios.get(`${domain}/api/activity?${activityParams.toString()}`)
                .catch((err) => {
                    console.log('⚠️ Activity API failed:', err?.response?.status, err?.response?.data?.message || err.message);
                    return { 
                        data: { 
                            success: false, 
                            error: err?.response?.data?.message || err.message,
                            data: { dateGroups: [], hasMoreDates: false, nextDate: null } 
                        } 
                    };
                }),
            axios.get(`${domain}/api/materialActivity?${materialParams.toString()}`)
                .catch((err) => {
                    console.log('⚠️ Material Activity API failed:', err?.response?.status, err?.response?.data?.message || err.message);
                    return { 
                        data: { 
                            success: false, 
                            error: err?.response?.data?.message || err.message,
                            data: { dateGroups: [], hasMoreDates: false, nextDate: null } 
                        } 
                    };
                }),
        ]);
        
        console.log('✅ Parallel calls completed');
        console.log('   - Activity Success:', activityRes.data.success !== false);
        console.log('   - Material Success:', materialActivityRes.data.success !== false);
        
        // Extract date groups like the notification page does
        const activityData = activityRes.data;
        const materialData = materialActivityRes.data;
        
        const activityDateGroups = (activityData.success !== false) 
            ? (activityData.data?.dateGroups || activityData.dateGroups || [])
            : [];
        const materialDateGroups = (materialData.success !== false)
            ? (materialData.data?.dateGroups || materialData.dateGroups || [])
            : [];
        
        console.log('✅ Extracted Date Groups:');
        console.log('   - Activity Date Groups:', activityDateGroups.length);
        console.log('   - Material Date Groups:', materialDateGroups.length);
        
        // Merge date groups like notification page
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
        
        const sortedDates = Object.keys(allDateGroups).sort((a, b) => b.localeCompare(a));
        const mergedDateGroups = sortedDates.map(date => ({
            date,
            activities: allDateGroups[date].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            ),
            count: allDateGroups[date].length
        }));
        
        console.log('✅ Merged Date Groups:', mergedDateGroups.length);
        
        if (mergedDateGroups.length > 0) {
            console.log('\n📊 MERGED GROUPS BREAKDOWN:');
            mergedDateGroups.forEach((group, index) => {
                const activityCount = group.activities.filter(item => item.type === 'activity').length;
                const materialCount = group.activities.filter(item => item.type === 'material').length;
                const materialUsedCount = group.activities.filter(item => 
                    item.type === 'material' && item.data.activity === 'used'
                ).length;
                const materialImportedCount = group.activities.filter(item => 
                    item.type === 'material' && item.data.activity === 'imported'
                ).length;
                
                console.log(`   Group ${index + 1}: ${group.date}`);
                console.log(`     - Total: ${group.count}`);
                console.log(`     - Activities: ${activityCount}`);
                console.log(`     - Materials: ${materialCount} (${materialImportedCount} imported, ${materialUsedCount} used)`);
                
                // Show material activities specifically
                const materialActivities = group.activities.filter(item => item.type === 'material');
                if (materialActivities.length > 0) {
                    console.log(`     - Material Activities Details:`);
                    materialActivities.forEach((item, idx) => {
                        const material = item.data;
                        console.log(`       ${idx + 1}. ${material.activity.toUpperCase()}: ${material.materials?.length || 0} materials by ${material.user?.fullName || 'Unknown'}`);
                        console.log(`          Message: ${material.message || 'No message'}`);
                        console.log(`          Date: ${material.date || material.createdAt}`);
                    });
                }
            });
        } else {
            console.log('❌ NO MERGED GROUPS - This means notification page will show empty state!');
        }
        
        // 5. Test specific tab filtering
        console.log('\n5️⃣ TESTING TAB FILTERING LOGIC');
        console.log('-'.repeat(40));
        
        const tabs = ['all', 'material'];
        const materialSubTabs = ['imported', 'used'];
        
        tabs.forEach(activeTab => {
            console.log(`\n📑 Testing ${activeTab.toUpperCase()} tab:`);
            
            if (activeTab === 'material') {
                materialSubTabs.forEach(materialSubTab => {
                    console.log(`  📑 Testing ${materialSubTab.toUpperCase()} sub-tab:`);
                    
                    const filteredGroups = mergedDateGroups.map(group => {
                        const filteredGroupActivities = group.activities.filter(item => 
                            item.type === 'material' && 
                            item.data.activity === materialSubTab
                        );
                        
                        return {
                            date: group.date,
                            activities: filteredGroupActivities
                        };
                    }).filter(group => group.activities.length > 0);
                    
                    console.log(`    - Filtered Groups: ${filteredGroups.length}`);
                    console.log(`    - Total Activities: ${filteredGroups.reduce((sum, group) => sum + group.activities.length, 0)}`);
                    
                    if (filteredGroups.length > 0) {
                        console.log(`    - Sample Group: ${filteredGroups[0].date} (${filteredGroups[0].activities.length} activities)`);
                    }
                });
            } else {
                // All tab
                console.log(`  - Total Groups: ${mergedDateGroups.length}`);
                console.log(`  - Total Activities: ${mergedDateGroups.reduce((sum, group) => sum + group.activities.length, 0)}`);
            }
        });
        
        // 6. Final diagnosis
        console.log('\n6️⃣ FINAL DIAGNOSIS');
        console.log('-'.repeat(40));
        
        const totalMaterialActivities = materialDateGroups.reduce((sum, group) => sum + group.activities.length, 0);
        const totalUsedMaterialActivities = materialDateGroups.reduce((sum, group) => {
            return sum + group.activities.filter(activity => activity.activity === 'used').length;
        }, 0);
        
        console.log('📊 SUMMARY:');
        console.log(`   - MaterialActivity API working: ${materialResponse.status === 200 ? '✅' : '❌'}`);
        console.log(`   - Total material activities in DB: ${totalMaterialActivities}`);
        console.log(`   - Total "used" material activities: ${totalUsedMaterialActivities}`);
        console.log(`   - Date groups available: ${materialDateGroups.length}`);
        console.log(`   - Notification page would show: ${mergedDateGroups.length} date groups`);
        
        if (totalUsedMaterialActivities === 0) {
            console.log('\n❌ PROBLEM IDENTIFIED: NO "USED" MATERIAL ACTIVITIES FOUND!');
            console.log('   This means the batch API is not creating MaterialActivity records properly.');
            console.log('   Check the batch API logs to see if MaterialActivity.save() is working.');
        } else if (mergedDateGroups.length === 0) {
            console.log('\n❌ PROBLEM IDENTIFIED: DATE GROUPS NOT MERGING PROPERLY!');
            console.log('   Material activities exist but are not being merged into date groups.');
        } else {
            const usedInMerged = mergedDateGroups.reduce((sum, group) => {
                return sum + group.activities.filter(item => 
                    item.type === 'material' && item.data.activity === 'used'
                ).length;
            }, 0);
            
            if (usedInMerged === 0) {
                console.log('\n❌ PROBLEM IDENTIFIED: USED ACTIVITIES NOT IN MERGED GROUPS!');
                console.log('   Material activities exist but "used" activities are not appearing in merged groups.');
            } else {
                console.log('\n✅ EVERYTHING LOOKS GOOD!');
                console.log(`   Found ${usedInMerged} "used" material activities in merged groups.`);
                console.log('   The notification page should display these activities.');
                console.log('   If user still can\'t see them, check:');
                console.log('   1. User is on the correct tab (Materials > Used)');
                console.log('   2. User is using the correct domain/port (localhost:8080)');
                console.log('   3. No JavaScript errors in the app');
            }
        }
        
    } catch (error) {
        console.error('\n❌ COMPREHENSIVE TEST FAILED:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testCompleteFlow();