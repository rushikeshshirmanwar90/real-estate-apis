const { MongoClient } = require('mongodb');

// Database cleanup script for invalid project IDs in MaterialActivity collection
async function cleanupInvalidProjectIds() {
    console.log('\n========================================');
    console.log('🧹 MATERIAL ACTIVITY CLEANUP SCRIPT');
    console.log('========================================');

    // Update these with your actual MongoDB connection details
    const mongoUrl = 'mongodb://localhost:27017'; // Update if different
    const dbName = 'your-database-name'; // Update with your actual database name
    
    let client;
    
    try {
        console.log('🔌 Connecting to MongoDB...');
        client = new MongoClient(mongoUrl);
        await client.connect();
        
        const db = client.db(dbName);
        const materialActivityCollection = db.collection('materialactivities');
        
        console.log('✅ Connected to database');
        
        // Find all MaterialActivity documents
        console.log('\n🔍 Analyzing MaterialActivity collection...');
        const allActivities = await materialActivityCollection.find({}).toArray();
        console.log(`📊 Total MaterialActivity documents: ${allActivities.length}`);
        
        // Analyze project IDs
        const projectIdAnalysis = {
            valid: [],
            invalid: [],
            missing: []
        };
        
        allActivities.forEach((activity, index) => {
            const projectId = activity.projectId;
            
            if (!projectId) {
                projectIdAnalysis.missing.push({
                    _id: activity._id,
                    index: index + 1
                });
            } else if (typeof projectId !== 'string' || projectId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(projectId)) {
                projectIdAnalysis.invalid.push({
                    _id: activity._id,
                    projectId: projectId,
                    index: index + 1,
                    user: activity.user?.fullName || 'Unknown',
                    activity: activity.activity,
                    date: activity.date
                });
            } else {
                projectIdAnalysis.valid.push(projectId);
            }
        });
        
        console.log('\n📊 PROJECT ID ANALYSIS:');
        console.log(`  ✅ Valid project IDs: ${projectIdAnalysis.valid.length}`);
        console.log(`  ❌ Invalid project IDs: ${projectIdAnalysis.invalid.length}`);
        console.log(`  ⚠️ Missing project IDs: ${projectIdAnalysis.missing.length}`);
        
        // Show invalid project IDs
        if (projectIdAnalysis.invalid.length > 0) {
            console.log('\n❌ INVALID PROJECT IDs FOUND:');
            projectIdAnalysis.invalid.forEach((item, index) => {
                console.log(`  ${index + 1}. Document #${item.index}`);
                console.log(`     _id: ${item._id}`);
                console.log(`     projectId: "${item.projectId}" (${typeof item.projectId})`);
                console.log(`     User: ${item.user}`);
                console.log(`     Activity: ${item.activity}`);
                console.log(`     Date: ${item.date}`);
                console.log('');
            });
            
            console.log('\n🔧 RECOMMENDED ACTIONS:');
            console.log('1. Review the invalid project IDs above');
            console.log('2. Determine if they should be:');
            console.log('   a) Updated to valid ObjectIds');
            console.log('   b) Deleted (if they are test data)');
            console.log('   c) Left as-is (API will handle gracefully)');
            
            console.log('\n💡 CLEANUP OPTIONS:');
            console.log('Option 1 - Delete test/invalid activities:');
            console.log('  db.materialactivities.deleteMany({');
            console.log('    projectId: { $not: /^[0-9a-fA-F]{24}$/ }');
            console.log('  });');
            
            console.log('\nOption 2 - Update to a default project ID:');
            console.log('  // First, create a default project or use existing one');
            console.log('  const defaultProjectId = "674a1b2c3d4e5f6789012345"; // Replace with real ID');
            console.log('  db.materialactivities.updateMany(');
            console.log('    { projectId: { $not: /^[0-9a-fA-F]{24}$/ } },');
            console.log('    { $set: { projectId: defaultProjectId } }');
            console.log('  );');
        }
        
        // Show missing project IDs
        if (projectIdAnalysis.missing.length > 0) {
            console.log('\n⚠️ MISSING PROJECT IDs:');
            projectIdAnalysis.missing.forEach((item, index) => {
                console.log(`  ${index + 1}. Document #${item.index} (_id: ${item._id})`);
            });
        }
        
        // Check if valid project IDs actually exist in Projects collection
        if (projectIdAnalysis.valid.length > 0) {
            console.log('\n🔍 Checking if valid project IDs exist in Projects collection...');
            const projectsCollection = db.collection('projects');
            
            const uniqueValidIds = [...new Set(projectIdAnalysis.valid)];
            const existingProjects = await projectsCollection.find({
                _id: { $in: uniqueValidIds.map(id => ({ $oid: id })) }
            }).toArray();
            
            console.log(`📊 Unique valid project IDs: ${uniqueValidIds.length}`);
            console.log(`📊 Existing projects found: ${existingProjects.length}`);
            
            if (existingProjects.length < uniqueValidIds.length) {
                const existingIds = existingProjects.map(p => p._id.toString());
                const orphanedIds = uniqueValidIds.filter(id => !existingIds.includes(id));
                
                console.log(`⚠️ Orphaned project IDs (valid format but project doesn't exist): ${orphanedIds.length}`);
                orphanedIds.forEach((id, index) => {
                    console.log(`  ${index + 1}. ${id}`);
                });
            }
        }
        
        console.log('\n========================================');
        console.log('✅ ANALYSIS COMPLETED');
        console.log('========================================');
        console.log('\n💡 NEXT STEPS:');
        console.log('1. The API has been updated to handle invalid project IDs gracefully');
        console.log('2. Your PDF reports should now work without errors');
        console.log('3. Consider cleaning up invalid data using the options above');
        console.log('4. Test the PDF generation again');
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the cleanup analysis
cleanupInvalidProjectIds().catch(console.error);