const { MongoClient, ObjectId } = require('mongodb');

// Debug script to check why MaterialUsed array is empty
async function debugEmptyMaterialUsage() {
    console.log('\n========================================');
    console.log('🔍 DEBUGGING EMPTY MATERIAL USAGE');
    console.log('========================================');

    // MongoDB connection string - update this with your actual connection string  
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';
    
    // Replace with your actual project and client IDs from the logs
    const projectId = '6947d14206f922bb666c9dae'; // From your logs
    const clientId = '6947ca5feb038ceeb22be7ee';   // From your logs
    
    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        const projectsCollection = db.collection('projects');

        // Find the specific project
        console.log('\n📋 SEARCHING FOR PROJECT:');
        console.log('  - Project ID:', projectId);
        console.log('  - Client ID:', clientId);

        const project = await projectsCollection.findOne({
            _id: new ObjectId(projectId),
            clientId: new ObjectId(clientId)
        });

        if (!project) {
            console.log('❌ PROJECT NOT FOUND!');
            console.log('Possible issues:');
            console.log('1. Project ID is incorrect');
            console.log('2. Client ID is incorrect');
            console.log('3. Project doesn\'t exist in database');
            
            // Search for projects with similar IDs
            console.log('\n🔍 SEARCHING FOR SIMILAR PROJECTS:');
            const similarProjects = await projectsCollection.find({
                $or: [
                    { _id: new ObjectId(projectId) },
                    { clientId: new ObjectId(clientId) }
                ]
            }).limit(5).toArray();
            
            console.log(`Found ${similarProjects.length} similar projects:`);
            similarProjects.forEach((p, index) => {
                console.log(`  ${index + 1}. Project: ${p.name || 'Unnamed'}`);
                console.log(`     - ID: ${p._id}`);
                console.log(`     - Client ID: ${p.clientId}`);
                console.log(`     - MaterialUsed count: ${p.MaterialUsed?.length || 0}`);
                console.log(`     - MaterialAvailable count: ${p.MaterialAvailable?.length || 0}`);
            });
            
            return;
        }

        console.log('✅ PROJECT FOUND:');
        console.log('  - Name:', project.name || 'Unnamed');
        console.log('  - ID:', project._id);
        console.log('  - Client ID:', project.clientId);

        // Check MaterialUsed array
        console.log('\n📦 MATERIAL USAGE ANALYSIS:');
        const materialUsed = project.MaterialUsed || [];
        const materialAvailable = project.MaterialAvailable || [];
        
        console.log('  - MaterialUsed count:', materialUsed.length);
        console.log('  - MaterialAvailable count:', materialAvailable.length);

        if (materialUsed.length === 0) {
            console.log('\n⚠️ MATERIAL USED IS EMPTY!');
            console.log('This means:');
            console.log('1. No materials have been used yet in this project');
            console.log('2. All material usage operations failed');
            console.log('3. Materials were used but not saved properly');
            
            if (materialAvailable.length > 0) {
                console.log('\n📋 AVAILABLE MATERIALS (ready to be used):');
                materialAvailable.slice(0, 5).forEach((material, index) => {
                    console.log(`  ${index + 1}. ${material.name}`);
                    console.log(`     - Quantity: ${material.qnt} ${material.unit}`);
                    console.log(`     - Per-unit cost: ${material.perUnitCost || 'N/A'}`);
                    console.log(`     - Total cost: ${material.totalCost || 'N/A'}`);
                    console.log(`     - Section ID: ${material.sectionId || 'Global'}`);
                });
                
                console.log('\n💡 SOLUTION:');
                console.log('You have available materials but haven\'t used any yet.');
                console.log('To test material usage:');
                console.log('1. Go to your app');
                console.log('2. Click "Add Usage" button');
                console.log('3. Select materials and quantities to use');
                console.log('4. Submit the usage form');
                console.log('5. Check the "Used Materials" tab');
            } else {
                console.log('\n❌ NO MATERIALS AVAILABLE EITHER!');
                console.log('You need to:');
                console.log('1. First add materials using "Add Material" button');
                console.log('2. Then use those materials with "Add Usage" button');
            }
        } else {
            console.log('\n✅ MATERIAL USAGE FOUND:');
            materialUsed.slice(0, 5).forEach((material, index) => {
                console.log(`  ${index + 1}. ${material.name}`);
                console.log(`     - Quantity used: ${material.qnt} ${material.unit}`);
                console.log(`     - Per-unit cost: ${material.perUnitCost || 'N/A'}`);
                console.log(`     - Total cost: ${material.totalCost || 'N/A'}`);
                console.log(`     - Section ID: ${material.sectionId || 'N/A'}`);
                console.log(`     - Mini-section ID: ${material.miniSectionId || 'N/A'}`);
                console.log(`     - Added at: ${material.addedAt || material.createdAt || 'N/A'}`);
            });
        }

        // Check for recent material activity
        console.log('\n📊 CHECKING MATERIAL ACTIVITY LOG:');
        const materialActivityCollection = db.collection('materialactivities');
        
        const recentActivity = await materialActivityCollection.find({
            projectId: projectId,
            activity: 'used'
        }).sort({ date: -1 }).limit(5).toArray();

        console.log(`Found ${recentActivity.length} recent "used" activities:`);
        recentActivity.forEach((activity, index) => {
            console.log(`  ${index + 1}. ${activity.date}`);
            console.log(`     - User: ${activity.user?.fullName || 'Unknown'}`);
            console.log(`     - Materials: ${activity.materials?.length || 0}`);
            console.log(`     - Message: ${activity.message || 'No message'}`);
        });

        // Check project sections
        console.log('\n🏗️ PROJECT SECTIONS:');
        const sections = project.section || [];
        console.log(`Found ${sections.length} sections:`);
        sections.forEach((section, index) => {
            console.log(`  ${index + 1}. ${section.name} (ID: ${section.sectionId || section._id})`);
            console.log(`     - Type: ${section.type}`);
        });

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Make sure:');
        console.error('1. MongoDB is running');
        console.error('2. Connection string is correct');
        console.error('3. Database name is correct');
        console.error('4. You have proper permissions');
    } finally {
        await client.close();
        console.log('\n========================================');
        console.log('🔍 DEBUGGING COMPLETED');
        console.log('========================================\n');
    }
}

// Run the debug script
debugEmptyMaterialUsage().catch(console.error);