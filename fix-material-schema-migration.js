const { MongoClient, ObjectId } = require('mongodb');

// Migration script to fix material schema issues
async function fixMaterialSchemaMigration() {
    console.log('\n========================================');
    console.log('🔧 MATERIAL SCHEMA MIGRATION');
    console.log('========================================');

    // MongoDB connection string - update this with your actual connection string
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';
    
    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        const projectsCollection = db.collection('projects');

        // Find all projects
        console.log('\n📋 FINDING ALL PROJECTS...');
        const projects = await projectsCollection.find({}).toArray();
        console.log(`Found ${projects.length} projects to check`);

        let updatedProjects = 0;
        let totalMaterialsFixed = 0;

        for (const project of projects) {
            console.log(`\n🔍 Processing project: ${project.name || 'Unnamed'} (${project._id})`);
            
            let needsUpdate = false;
            let materialAvailableFixed = 0;
            let materialUsedFixed = 0;

            // Fix MaterialAvailable - add missing fields
            if (project.MaterialAvailable && Array.isArray(project.MaterialAvailable)) {
                console.log(`  📦 Checking ${project.MaterialAvailable.length} available materials...`);
                
                project.MaterialAvailable.forEach((material, index) => {
                    let materialUpdated = false;
                    
                    // Add missing sectionId (make it null for global materials)
                    if (material.sectionId === undefined) {
                        material.sectionId = null; // Global material
                        materialUpdated = true;
                    }
                    
                    // Add missing miniSectionId
                    if (material.miniSectionId === undefined) {
                        material.miniSectionId = null;
                        materialUpdated = true;
                    }
                    
                    // Ensure perUnitCost exists
                    if (material.perUnitCost === undefined) {
                        material.perUnitCost = material.cost || 0;
                        materialUpdated = true;
                    }
                    
                    // Ensure totalCost exists
                    if (material.totalCost === undefined) {
                        material.totalCost = (material.perUnitCost || material.cost || 0) * (material.qnt || 1);
                        materialUpdated = true;
                    }
                    
                    // Add addedAt if missing
                    if (!material.addedAt) {
                        material.addedAt = material.createdAt || new Date();
                        materialUpdated = true;
                    }
                    
                    if (materialUpdated) {
                        materialAvailableFixed++;
                        needsUpdate = true;
                        console.log(`    ✅ Fixed material: ${material.name}`);
                    }
                });
            }

            // Fix MaterialUsed - ensure required fields exist
            if (project.MaterialUsed && Array.isArray(project.MaterialUsed)) {
                console.log(`  🔄 Checking ${project.MaterialUsed.length} used materials...`);
                
                project.MaterialUsed.forEach((material, index) => {
                    let materialUpdated = false;
                    
                    // Ensure sectionId exists (required for MaterialUsed)
                    if (!material.sectionId) {
                        // Try to infer from project sections or set to first section
                        if (project.section && project.section.length > 0) {
                            material.sectionId = project.section[0].sectionId || project.section[0]._id;
                        } else {
                            material.sectionId = 'default-section';
                        }
                        materialUpdated = true;
                    }
                    
                    // Add missing miniSectionId
                    if (material.miniSectionId === undefined) {
                        material.miniSectionId = null;
                        materialUpdated = true;
                    }
                    
                    // Ensure perUnitCost exists
                    if (material.perUnitCost === undefined) {
                        material.perUnitCost = material.cost || 0;
                        materialUpdated = true;
                    }
                    
                    // Ensure totalCost exists
                    if (material.totalCost === undefined) {
                        material.totalCost = (material.perUnitCost || material.cost || 0) * (material.qnt || 1);
                        materialUpdated = true;
                    }
                    
                    // Add addedAt if missing
                    if (!material.addedAt) {
                        material.addedAt = material.createdAt || new Date();
                        materialUpdated = true;
                    }
                    
                    if (materialUpdated) {
                        materialUsedFixed++;
                        needsUpdate = true;
                        console.log(`    ✅ Fixed used material: ${material.name}`);
                    }
                });
            }

            // Update the project if changes were made
            if (needsUpdate) {
                console.log(`  💾 Updating project with ${materialAvailableFixed} available + ${materialUsedFixed} used materials fixed...`);
                
                await projectsCollection.updateOne(
                    { _id: project._id },
                    { 
                        $set: { 
                            MaterialAvailable: project.MaterialAvailable || [],
                            MaterialUsed: project.MaterialUsed || []
                        }
                    }
                );
                
                updatedProjects++;
                totalMaterialsFixed += materialAvailableFixed + materialUsedFixed;
                console.log(`  ✅ Project updated successfully`);
            } else {
                console.log(`  ✓ Project already has correct schema`);
            }
        }

        console.log('\n========================================');
        console.log('📊 MIGRATION SUMMARY');
        console.log('========================================');
        console.log(`✅ Projects processed: ${projects.length}`);
        console.log(`✅ Projects updated: ${updatedProjects}`);
        console.log(`✅ Total materials fixed: ${totalMaterialsFixed}`);
        console.log('========================================');

        // Verify the migration worked
        console.log('\n🔍 VERIFYING MIGRATION...');
        const verifyProject = await projectsCollection.findOne({
            $or: [
                { 'MaterialAvailable.0': { $exists: true } },
                { 'MaterialUsed.0': { $exists: true } }
            ]
        });

        if (verifyProject) {
            console.log('✅ VERIFICATION SUCCESSFUL');
            console.log('Sample project after migration:');
            
            if (verifyProject.MaterialAvailable && verifyProject.MaterialAvailable.length > 0) {
                const sampleAvailable = verifyProject.MaterialAvailable[0];
                console.log('  Sample MaterialAvailable:');
                console.log(`    - Name: ${sampleAvailable.name}`);
                console.log(`    - sectionId: ${sampleAvailable.sectionId}`);
                console.log(`    - perUnitCost: ${sampleAvailable.perUnitCost}`);
                console.log(`    - totalCost: ${sampleAvailable.totalCost}`);
            }
            
            if (verifyProject.MaterialUsed && verifyProject.MaterialUsed.length > 0) {
                const sampleUsed = verifyProject.MaterialUsed[0];
                console.log('  Sample MaterialUsed:');
                console.log(`    - Name: ${sampleUsed.name}`);
                console.log(`    - sectionId: ${sampleUsed.sectionId}`);
                console.log(`    - perUnitCost: ${sampleUsed.perUnitCost}`);
                console.log(`    - totalCost: ${sampleUsed.totalCost}`);
            }
        }

    } catch (error) {
        console.error('\n❌ MIGRATION ERROR:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await client.close();
        console.log('\n========================================');
        console.log('🔧 MIGRATION COMPLETED');
        console.log('========================================\n');
    }
}

// Run the migration
fixMaterialSchemaMigration().catch(console.error);