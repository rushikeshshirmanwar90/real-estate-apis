const axios = require('axios');

// Debug script to analyze actual MaterialActivity cost data
async function debugMaterialActivityCosts() {
    console.log('\n========================================');
    console.log('🔍 DEBUGGING MATERIAL ACTIVITY COSTS');
    console.log('========================================');

    const baseURL = 'http://localhost:3000'; // Adjust if needed
    
    // Test parameters - replace with actual values
    const testParams = {
        clientId: '6941b27c7fdcea3d37e02ada', // Your actual client ID
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        activity: 'all'
    };

    try {
        console.log('📋 Test Parameters:');
        console.log('  - Client ID:', testParams.clientId);
        console.log('  - Date Range:', testParams.startDate, 'to', testParams.endDate);

        const params = new URLSearchParams(testParams);
        const url = `${baseURL}/api/material-activity-report?${params.toString()}`;
        
        console.log('\n🌐 API Request URL:', url);

        const response = await axios.get(url);

        if (response.data.success && response.data.data) {
            const { activities, summary } = response.data.data;
            
            console.log('\n📊 API SUMMARY:');
            console.log('  - Total Activities:', summary.totalActivities);
            console.log('  - Total Cost (API):', `₹${summary.totalCost.toLocaleString('en-IN')}`);
            console.log('  - Total Cost (raw):', summary.totalCost);

            console.log('\n🔍 DETAILED COST ANALYSIS:');
            let manualTotal = 0;
            let activityCount = 0;

            activities.forEach((activity, index) => {
                if (index < 10) { // Show first 10 activities in detail
                    console.log(`\n${index + 1}. Activity: ${activity._id}`);
                    console.log(`   Type: ${activity.activity.toUpperCase()}`);
                    console.log(`   User: ${activity.user.fullName}`);
                    console.log(`   Date: ${activity.date}`);
                    console.log(`   Materials: ${activity.materials.length}`);
                    
                    let activityTotal = 0;
                    activity.materials.forEach((material, matIndex) => {
                        const cost = material.cost;
                        const qty = material.qnt;
                        
                        console.log(`     ${matIndex + 1}. ${material.name}`);
                        console.log(`        Quantity: ${qty} ${material.unit}`);
                        console.log(`        Cost (stored): ${cost} (type: ${typeof cost})`);
                        console.log(`        Cost formatted: ₹${Number(cost).toLocaleString('en-IN')}`);
                        
                        // Check if cost might be per-unit or total
                        if (qty > 1 && cost > 0) {
                            const possiblePerUnit = cost / qty;
                            console.log(`        Possible per-unit: ₹${possiblePerUnit.toFixed(2)}`);
                            console.log(`        If per-unit, total would be: ₹${cost.toFixed(2)}`);
                            console.log(`        If already total: ₹${cost.toFixed(2)}`);
                        }
                        
                        activityTotal += Number(cost) || 0;
                    });
                    
                    console.log(`   Activity Total: ₹${activityTotal.toLocaleString('en-IN')}`);
                    manualTotal += activityTotal;
                } else if (index === 10) {
                    console.log(`\n... (showing first 10 activities, ${activities.length - 10} more exist)`);
                }
                
                // Still calculate total for all activities
                const actTotal = activity.materials.reduce((sum, mat) => sum + (Number(mat.cost) || 0), 0);
                if (index >= 10) {
                    manualTotal += actTotal;
                }
                activityCount++;
            });

            console.log('\n💰 COST VERIFICATION:');
            console.log(`  - API Total: ₹${summary.totalCost.toLocaleString('en-IN')}`);
            console.log(`  - Manual Total: ₹${manualTotal.toLocaleString('en-IN')}`);
            console.log(`  - Difference: ₹${Math.abs(summary.totalCost - manualTotal).toLocaleString('en-IN')}`);
            console.log(`  - Match: ${summary.totalCost === manualTotal ? '✅ YES' : '❌ NO'}`);

            // Analyze cost patterns
            console.log('\n📈 COST PATTERN ANALYSIS:');
            let totalMaterials = 0;
            let materialsWithCost = 0;
            let costSum = 0;
            let minCost = Infinity;
            let maxCost = 0;
            
            activities.forEach(activity => {
                activity.materials.forEach(material => {
                    totalMaterials++;
                    const cost = Number(material.cost) || 0;
                    if (cost > 0) {
                        materialsWithCost++;
                        costSum += cost;
                        minCost = Math.min(minCost, cost);
                        maxCost = Math.max(maxCost, cost);
                    }
                });
            });

            console.log(`  - Total materials: ${totalMaterials}`);
            console.log(`  - Materials with cost > 0: ${materialsWithCost}`);
            console.log(`  - Average cost per material: ₹${(costSum / materialsWithCost).toFixed(2)}`);
            console.log(`  - Min cost: ₹${minCost === Infinity ? 0 : minCost}`);
            console.log(`  - Max cost: ₹${maxCost.toLocaleString('en-IN')}`);

            // Check for suspicious cost values
            console.log('\n🚨 SUSPICIOUS COST VALUES:');
            let suspiciousCount = 0;
            activities.forEach((activity, actIndex) => {
                activity.materials.forEach((material, matIndex) => {
                    const cost = Number(material.cost) || 0;
                    const qty = material.qnt;
                    
                    // Flag potentially suspicious values
                    if (cost > 0 && cost < 1) {
                        console.log(`  ⚠️ Very low cost: Activity ${actIndex + 1}, Material ${matIndex + 1}`);
                        console.log(`     ${material.name}: ₹${cost} for ${qty} ${material.unit}`);
                        suspiciousCount++;
                    }
                    
                    if (cost > 100000) {
                        console.log(`  ⚠️ Very high cost: Activity ${actIndex + 1}, Material ${matIndex + 1}`);
                        console.log(`     ${material.name}: ₹${cost.toLocaleString('en-IN')} for ${qty} ${material.unit}`);
                        suspiciousCount++;
                    }
                });
            });
            
            if (suspiciousCount === 0) {
                console.log('  ✅ No suspicious cost values found');
            }

            // Sample raw data for inspection
            console.log('\n📋 SAMPLE RAW MATERIAL DATA:');
            if (activities.length > 0 && activities[0].materials.length > 0) {
                const sampleMaterial = activities[0].materials[0];
                console.log('  Sample material object:');
                console.log(JSON.stringify(sampleMaterial, null, 4));
            }

        } else {
            console.error('❌ No data in response or API failed');
            console.error('Response:', response.data);
        }

        console.log('\n========================================');
        console.log('✅ COST ANALYSIS COMPLETED');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ ANALYSIS FAILED');
        console.error('========================================');
        console.error('Error:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        
        console.error('========================================\n');
    }
}

// Run the analysis
debugMaterialActivityCosts().catch(console.error);