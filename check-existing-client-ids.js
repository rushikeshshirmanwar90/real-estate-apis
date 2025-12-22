const { MongoClient } = require('mongodb');

async function checkExistingClientIds() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('\n========================================');
        console.log('🔍 CHECKING EXISTING CLIENT IDS');
        console.log('========================================');

        const db = client.db('real-estate');
        
        // Check MaterialActivity collection
        const materialActivityCollection = db.collection('materialactivities');
        const materialActivities = await materialActivityCollection.find({}).limit(20).toArray();
        
        console.log(`📋 MaterialActivity collection: ${materialActivities.length} records found`);
        
        if (materialActivities.length > 0) {
            console.log('\n📊 Sample MaterialActivity records:');
            materialActivities.forEach((activity, index) => {
                console.log(`  ${index + 1}. Client ID: ${activity.clientId}`);
                console.log(`     Activity: ${activity.activity}`);
                console.log(`     Date: ${activity.date}`);
                console.log(`     Materials: ${activity.materials?.length || 0}`);
                console.log(`     User: ${activity.user?.fullName || 'Unknown'}`);
                console.log(`     Project ID: ${activity.projectId}`);
                if (activity.materials && activity.materials.length > 0) {
                    const totalCost = activity.materials.reduce((sum, mat) => sum + (Number(mat.cost) || 0), 0);
                    console.log(`     Total Cost: ₹${totalCost.toLocaleString('en-IN')}`);
                }
                console.log('');
            });
            
            // Get unique client IDs
            const uniqueClientIds = [...new Set(materialActivities.map(a => a.clientId))];
            console.log(`📋 Unique Client IDs found: ${uniqueClientIds.length}`);
            uniqueClientIds.forEach((clientId, index) => {
                console.log(`  ${index + 1}. ${clientId}`);
            });
        }
        
        // Check Activity collection too
        const activityCollection = db.collection('activities');
        const activities = await activityCollection.find({}).limit(10).toArray();
        
        console.log(`\n📋 Activity collection: ${activities.length} records found`);
        
        if (activities.length > 0) {
            console.log('\n📊 Sample Activity records:');
            activities.slice(0, 5).forEach((activity, index) => {
                console.log(`  ${index + 1}. Client ID: ${activity.clientId}`);
                console.log(`     Message: ${activity.message}`);
                console.log(`     Date: ${activity.date}`);
                console.log('');
            });
        }

        console.log('========================================');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

// Run the check
checkExistingClientIds().catch(console.error);