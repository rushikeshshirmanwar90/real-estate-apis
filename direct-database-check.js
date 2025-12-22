const { MongoClient, ObjectId } = require('mongodb');

// Direct database check to see exactly what's in MaterialUsed
async function directDatabaseCheck() {
    console.log('\n========================================');
    console.log('🔍 DIRECT DATABASE CHECK');
    console.log('========================================');

    // MongoDB connection string
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';
    
    // Your actual IDs from the logs
    const projectId = '6947d14206f922bb666c9dae';
    const clientId = '6947ca5feb038ceeb22be7ee';
    const sectionId = '6947d15e06f922bb666c9dc3';
    
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
        console.log('  - Section ID:', sectionId);

        const project = await projectsCollection.findOne({
            _id: new ObjectId(projectId),
            clientId: new ObjectId(clientId)
        });

        if (!project) {
            console.log('❌ PROJECT NOT FOUND!');
            return;
        }

        console.log('✅ PROJECT FOUND:', project.name || 'Unnamed');

        // Check MaterialUsed array
        const materialUsed = project.MaterialUsed || [];
        const materialAvailable = project.MaterialAvailable || [];
        
        console.log('\n📊 RAW DATABASE DATA:');
        console.log('  - MaterialUsed count:', materialUsed.length);
        console.log('  - MaterialAvailable count:', materialAvailable.length);

        if (materialUsed.length === 0) {
            console.log('\n⚠️ MATERIALUSED IS EMPTY IN DATABASE!');
            console.log('This confirms no materials have been used yet.');
            
            if (materialAvailable.length > 0) {
                console.log('\n📦 AVAILABLE MATERIALS (can be used):');
                materialAvailable.slice(0, 5).forEach((material, index) => {
                    console.log(`  ${index + 1}. ${material.name}`);
                    console.log(`     - Available: ${material.qnt} ${material.unit}`);
                    console.log(`     - Per-unit cost: ₹${material.perUnitCost || material.cost || 0}`);
                    console.log(`     - Section ID: ${material.sectionId || 'NONE'}`);
                    console.log(`     - ID: ${material._id}`);
                });
                
                console.log('\n🎯 SOLUTION: Use one of these materials!');
                console.log('Run this command to use the first material:');
                console.log('node add-test-material-usage.js');
            } else {
                console.log('\n❌ NO MATERIALS AVAILABLE EITHER!');
                console.log('You need to add materials first using your app.');
            }
        } else {
            console.log('\n✅ MATERIALUSED FOUND IN DATABASE:');
            materialUsed.forEach((material, index) => {
                console.log(`  ${index + 1}. ${material.name}`);
                console.log(`     - Used: ${material.qnt} ${material.unit}`);
                console.log(`     - Section ID: ${material.sectionId || 'NONE'}`);
                console.log(`     - Mini-section ID: ${material.miniSectionId || 'NONE'}`);
                console.log(`     - Per-unit cost: ₹${material.perUnitCost || 0}`);
                console.log(`     - Total cost: ₹${material.totalCost || 0}`);
                console.log(`     - Added at: ${material.addedAt || material.createdAt || 'N/A'}`);
            });

            // Check if filtering is the issue
            console.log('\n🔍 SECTION FILTERING ANALYSIS:');
            console.log('Current page sectionId:', sectionId);
            
            const matchingMaterials = materialUsed.filter(m => {
                const materialSectionId = String(m.sectionId || '');
                const requestedSectionId = String(sectionId);
                return materialSectionId === requestedSectionId;
            });
            
            console.log('Materials matching current section:', matchingMaterials.length);
            
            if (matchingMaterials.length === 0) {
                console.log('\n🚨 FILTERING ISSUE DETECTED!');
                console.log('Materials exist but none match the current sectionId.');
                console.log('This is why your API returns empty array.');
                
                console.log('\nMaterial sectionIds vs Current sectionId:');
                materialUsed.forEach((material, index) => {
                    const materialSectionId = String(material.sectionId || '');
                    const matches = materialSectionId === String(sectionId);
                    console.log(`  ${index + 1}. ${material.name}`);
                    console.log(`     - Material sectionId: "${materialSectionId}"`);
                    console.log(`     - Current sectionId: "${sectionId}"`);
                    console.log(`     - Match: ${matches ? '✅' : '❌'}`);
                });
            }
        }

        // Test the API filtering logic
        console.log('\n🧪 TESTING API FILTERING LOGIC:');
        const allUsed = project.MaterialUsed || [];
        console.log('Total MaterialUsed in project:', allUsed.length);
        
        const filteredUsed = sectionId
            ? allUsed.filter((m) => {
                const materialSectionId = String(m.sectionId || '');
                const requestedSectionId = String(sectionId);
                const matches = materialSectionId === requestedSectionId;
                console.log(`  Material: ${m.name}, Section: "${materialSectionId}", Requested: "${requestedSectionId}", Match: ${matches}`);
                return matches;
            })
            : allUsed;
        
        console.log('After filtering:', filteredUsed.length, 'materials');
        console.log('This is what the API would return:', filteredUsed.length > 0 ? 'Materials found' : 'Empty array');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Make sure:');
        console.error('1. MongoDB is running');
        console.error('2. Connection string is correct');
        console.error('3. Your server is running');
    } finally {
        await client.close();
        console.log('\n========================================');
        console.log('🔍 DATABASE CHECK COMPLETED');
        console.log('========================================\n');
    }
}

// Run the check
directDatabaseCheck().catch(console.error);