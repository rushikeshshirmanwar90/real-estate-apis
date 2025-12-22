const { default: fetch } = require('node-fetch');

async function testAPIResponse() {
    try {
        console.log('\n========================================');
        console.log('🔍 TESTING API RESPONSE');
        console.log('========================================');

        const clientId = '6941b27c7fdcea3d37e02ada';
        const url = `http://localhost:8080/api/material-activity-report?clientId=${clientId}`;
        
        console.log(`📋 Testing URL: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('📊 API Response Status:', response.status);
        console.log('📊 API Response Success:', data.success);
        
        if (data.success) {
            console.log('\n✅ API RESPONSE DATA:');
            console.log('========================================');
            console.log(`  - Total activities: ${data.data.activities.length}`);
            console.log(`  - Summary:`, data.data.summary);
            
            console.log('\n📋 ACTIVITIES BREAKDOWN:');
            data.data.activities.forEach((activity, index) => {
                const activityTotal = activity.materials.reduce((sum, mat) => sum + (mat.cost || 0), 0);
                console.log(`\n  Activity ${index + 1}:`);
                console.log(`    - ID: ${activity._id}`);
                console.log(`    - Type: ${activity.activity}`);
                console.log(`    - User: ${activity.user.fullName}`);
                console.log(`    - Project: ${activity.projectName}`);
                console.log(`    - Materials: ${activity.materials.length}`);
                console.log(`    - Date: ${activity.date}`);
                console.log(`    - Message: ${activity.message}`);
                
                console.log(`    📦 Materials:`);
                activity.materials.forEach((material, matIndex) => {
                    console.log(`      ${matIndex + 1}. ${material.name}`);
                    console.log(`         - Quantity: ${material.qnt} ${material.unit}`);
                    console.log(`         - Cost: ₹${material.cost.toLocaleString('en-IN')}`);
                });
                
                console.log(`    💰 Activity Total: ₹${activityTotal.toLocaleString('en-IN')}`);
            });
            
            console.log('\n========================================');
            console.log('📊 FINAL SUMMARY:');
            console.log('========================================');
            console.log(`  - Total Activities: ${data.data.summary.totalActivities}`);
            console.log(`  - Imported Count: ${data.data.summary.importedCount}`);
            console.log(`  - Used Count: ${data.data.summary.usedCount}`);
            console.log(`  - Total Materials: ${data.data.summary.totalMaterials}`);
            console.log(`  - Total Cost: ₹${data.data.summary.totalCost.toLocaleString('en-IN')}`);
            
            // Manual calculation verification
            const manualTotal = data.data.activities.reduce((sum, activity) => {
                return sum + activity.materials.reduce((matSum, material) => {
                    return matSum + (material.cost || 0);
                }, 0);
            }, 0);
            
            console.log(`  - Manual Calculation: ₹${manualTotal.toLocaleString('en-IN')}`);
            console.log(`  - Match: ${data.data.summary.totalCost === manualTotal ? '✅ YES' : '❌ NO'}`);
            
        } else {
            console.log('❌ API Error:', data.error);
        }
        
        console.log('========================================');

    } catch (error) {
        console.error('❌ Error testing API:', error);
    }
}

// Run the test
testAPIResponse().catch(console.error);