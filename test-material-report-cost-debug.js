const { MongoClient } = require('mongodb');

async function debugMaterialReportCosts() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('\n========================================');
        console.log('🔍 DEBUGGING MATERIAL REPORT COSTS');
        console.log('========================================');

        const db = client.db('real-estate');
        const materialActivityCollection = db.collection('materialactivities');

        // Test with a specific client ID
        const clientId = '6941b27c7fdcea3d37e02ada';
        
        console.log(`📋 Searching for MaterialActivity records for client: ${clientId}`);
        
        // Get all material activities for this client
        const activities = await materialActivityCollection.find({ 
            clientId: clientId 
        }).sort({ date: -1 }).toArray();

        console.log(`✅ Found ${activities.length} material activities`);

        if (activities.length === 0) {
            console.log('❌ No activities found. Let\'s check what client IDs exist:');
            const allActivities = await materialActivityCollection.find({}).limit(10).toArray();
            console.log('Sample activities:');
            allActivities.forEach((activity, index) => {
                console.log(`  ${index + 1}. Client ID: ${activity.clientId}, Activity: ${activity.activity}, Materials: ${activity.materials?.length || 0}`);
            });
            return;
        }

        let totalCostFromDB = 0;
        let totalMaterials = 0;

        console.log('\n📊 DETAILED COST ANALYSIS:');
        console.log('========================================');

        activities.forEach((activity, index) => {
            console.log(`\n🔍 Activity ${index + 1}:`);
            console.log(`  - ID: ${activity._id}`);
            console.log(`  - Type: ${activity.activity}`);
            console.log(`  - Date: ${activity.date}`);
            console.log(`  - User: ${activity.user?.fullName || 'Unknown'}`);
            console.log(`  - Project ID: ${activity.projectId}`);
            console.log(`  - Materials count: ${activity.materials?.length || 0}`);
            console.log(`  - Message: ${activity.message || 'No message'}`);

            if (activity.materials && Array.isArray(activity.materials)) {
                let activityTotal = 0;
                
                console.log(`  📦 Materials breakdown:`);
                activity.materials.forEach((material, matIndex) => {
                    const materialCost = Number(material.cost) || 0;
                    const quantity = Number(material.qnt) || 0;
                    
                    console.log(`    ${matIndex + 1}. ${material.name}`);
                    console.log(`       - Quantity: ${quantity} ${material.unit || 'units'}`);
                    console.log(`       - Cost (stored): ${materialCost}`);
                    console.log(`       - Cost type: ${typeof material.cost} (${material.cost})`);
                    
                    activityTotal += materialCost;
                    totalMaterials++;
                });
                
                console.log(`  💰 Activity total: ₹${activityTotal.toLocaleString('en-IN')}`);
                totalCostFromDB += activityTotal;
            } else {
                console.log(`  ❌ No materials array found or invalid format`);
            }
        });

        console.log('\n========================================');
        console.log('📊 FINAL SUMMARY:');
        console.log('========================================');
        console.log(`  - Total activities: ${activities.length}`);
        console.log(`  - Total materials: ${totalMaterials}`);
        console.log(`  - Total cost from DB: ₹${totalCostFromDB.toLocaleString('en-IN')}`);
        console.log(`  - Average cost per activity: ₹${(totalCostFromDB / activities.length).toLocaleString('en-IN')}`);
        console.log(`  - Average cost per material: ₹${totalMaterials > 0 ? (totalCostFromDB / totalMaterials).toLocaleString('en-IN') : '0'}`);

        // Test the API calculation logic
        console.log('\n🧮 TESTING API CALCULATION LOGIC:');
        console.log('========================================');
        
        const apiCalculatedTotal = activities.reduce((sum, activity) => {
            try {
                const activityCost = (activity.materials || []).reduce((matSum, material) => {
                    try {
                        const materialTotalCost = Number(material.cost) || 0;
                        return matSum + materialTotalCost;
                    } catch (materialError) {
                        console.error(`    Error processing material ${material.name}:`, materialError.message);
                        return matSum;
                    }
                }, 0);
                
                return sum + activityCost;
            } catch (activityError) {
                console.error(`  Error processing activity ${activity._id}:`, activityError.message);
                return sum;
            }
        }, 0);

        console.log(`  - API calculated total: ₹${apiCalculatedTotal.toLocaleString('en-IN')}`);
        console.log(`  - Match with DB total: ${totalCostFromDB === apiCalculatedTotal ? '✅ YES' : '❌ NO'}`);

        // Check for recent activities (last 7 days)
        console.log('\n📅 RECENT ACTIVITIES CHECK:');
        console.log('========================================');
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentActivities = activities.filter(activity => {
            const activityDate = new Date(activity.date);
            return activityDate >= sevenDaysAgo;
        });

        console.log(`  - Activities in last 7 days: ${recentActivities.length}`);
        
        if (recentActivities.length > 0) {
            const recentTotal = recentActivities.reduce((sum, activity) => {
                return sum + (activity.materials || []).reduce((matSum, material) => {
                    return matSum + (Number(material.cost) || 0);
                }, 0);
            }, 0);
            
            console.log(`  - Recent activities total: ₹${recentTotal.toLocaleString('en-IN')}`);
            
            console.log(`  📋 Recent activities details:`);
            recentActivities.forEach((activity, index) => {
                const activityTotal = (activity.materials || []).reduce((sum, material) => {
                    return sum + (Number(material.cost) || 0);
                }, 0);
                
                console.log(`    ${index + 1}. ${activity.activity} - ${activity.materials?.length || 0} materials - ₹${activityTotal.toLocaleString('en-IN')} (${new Date(activity.date).toLocaleDateString()})`);
            });
        }

        console.log('\n========================================');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

// Run the debug
debugMaterialReportCosts().catch(console.error);