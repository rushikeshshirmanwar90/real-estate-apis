const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://kirtanp04:Kirtan2004@cluster0.wbmhzpx.mongodb.net/real-estate?retryWrites=true&w=majority";

async function testNewCostStructure() {
    console.log('🧪 TESTING NEW COST STRUCTURE');
    console.log('========================================');
    
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db('real-estate');
        
        // Test 1: Check MaterialActivity schema
        console.log('\n📋 TEST 1: MaterialActivity Schema');
        const materialActivities = await db.collection('materialactivities').find({}).limit(3).toArray();
        
        if (materialActivities.length > 0) {
            console.log('✅ Found MaterialActivity documents');
            materialActivities.forEach((activity, index) => {
                console.log(`\n  Activity ${index + 1}:`);
                console.log(`    - Activity Type: ${activity.activity}`);
                console.log(`    - Materials Count: ${activity.materials?.length || 0}`);
                
                if (activity.materials && activity.materials.length > 0) {
                    const material = activity.materials[0];
                    console.log(`    - Sample Material: ${material.name}`);
                    console.log(`    - Has perUnitCost: ${material.perUnitCost !== undefined}`);
                    console.log(`    - Has totalCost: ${material.totalCost !== undefined}`);
                    console.log(`    - Has old cost: ${material.cost !== undefined}`);
                    
                    if (material.perUnitCost !== undefined) {
                        console.log(`    - Per Unit Cost: ₹${material.perUnitCost}`);
                    }
                    if (material.totalCost !== undefined) {
                        console.log(`    - Total Cost: ₹${material.totalCost}`);
                    }
                    if (material.cost !== undefined) {
                        console.log(`    - Old Cost Field: ₹${material.cost}`);
                    }
                }
            });
        } else {
            console.log('❌ No MaterialActivity documents found');
        }
        
        // Test 2: Check Projects schema
        console.log('\n📋 TEST 2: Projects Schema');
        const projects = await db.collection('projects').find({}).limit(2).toArray();
        
        if (projects.length > 0) {
            console.log('✅ Found Project documents');
            projects.forEach((project, index) => {
                console.log(`\n  Project ${index + 1}: ${project.name}`);
                
                // Check MaterialAvailable
                if (project.MaterialAvailable && project.MaterialAvailable.length > 0) {
                    const material = project.MaterialAvailable[0];
                    console.log(`    MaterialAvailable Sample: ${material.name}`);
                    console.log(`    - Has perUnitCost: ${material.perUnitCost !== undefined}`);
                    console.log(`    - Has totalCost: ${material.totalCost !== undefined}`);
                    console.log(`    - Has old cost: ${material.cost !== undefined}`);
                    
                    if (material.perUnitCost !== undefined) {
                        console.log(`    - Per Unit Cost: ₹${material.perUnitCost}`);
                    }
                    if (material.totalCost !== undefined) {
                        console.log(`    - Total Cost: ₹${material.totalCost}`);
                    }
                    if (material.cost !== undefined) {
                        console.log(`    - Old Cost Field: ₹${material.cost}`);
                    }
                }
                
                // Check MaterialUsed
                if (project.MaterialUsed && project.MaterialUsed.length > 0) {
                    const material = project.MaterialUsed[0];
                    console.log(`    MaterialUsed Sample: ${material.name}`);
                    console.log(`    - Has perUnitCost: ${material.perUnitCost !== undefined}`);
                    console.log(`    - Has totalCost: ${material.totalCost !== undefined}`);
                    console.log(`    - Has old cost: ${material.cost !== undefined}`);
                    
                    if (material.perUnitCost !== undefined) {
                        console.log(`    - Per Unit Cost: ₹${material.perUnitCost}`);
                    }
                    if (material.totalCost !== undefined) {
                        console.log(`    - Total Cost: ₹${material.totalCost}`);
                    }
                    if (material.cost !== undefined) {
                        console.log(`    - Old Cost Field: ₹${material.cost}`);
                    }
                }
            });
        } else {
            console.log('❌ No Project documents found');
        }
        
        // Test 3: Check for mixed cost structures
        console.log('\n📋 TEST 3: Mixed Cost Structure Analysis');
        
        // Count documents with old vs new cost structure in MaterialActivity
        const oldCostActivities = await db.collection('materialactivities').countDocuments({
            'materials.cost': { $exists: true },
            'materials.perUnitCost': { $exists: false }
        });
        
        const newCostActivities = await db.collection('materialactivities').countDocuments({
            'materials.perUnitCost': { $exists: true },
            'materials.totalCost': { $exists: true }
        });
        
        console.log(`  MaterialActivity Documents:`);
        console.log(`    - With old cost structure: ${oldCostActivities}`);
        console.log(`    - With new cost structure: ${newCostActivities}`);
        
        // Count documents with old vs new cost structure in Projects
        const oldCostProjects = await db.collection('projects').countDocuments({
            $or: [
                { 'MaterialAvailable.cost': { $exists: true }, 'MaterialAvailable.perUnitCost': { $exists: false } },
                { 'MaterialUsed.cost': { $exists: true }, 'MaterialUsed.perUnitCost': { $exists: false } }
            ]
        });
        
        const newCostProjects = await db.collection('projects').countDocuments({
            $or: [
                { 'MaterialAvailable.perUnitCost': { $exists: true }, 'MaterialAvailable.totalCost': { $exists: true } },
                { 'MaterialUsed.perUnitCost': { $exists: true }, 'MaterialUsed.totalCost': { $exists: true } }
            ]
        });
        
        console.log(`  Project Documents:`);
        console.log(`    - With old cost structure: ${oldCostProjects}`);
        console.log(`    - With new cost structure: ${newCostProjects}`);
        
        console.log('\n========================================');
        console.log('✅ NEW COST STRUCTURE TEST COMPLETED');
        
    } catch (error) {
        console.error('❌ Error testing new cost structure:', error);
    } finally {
        await client.close();
    }
}

testNewCostStructure();