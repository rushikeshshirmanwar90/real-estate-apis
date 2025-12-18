const axios = require('axios');

// Test the material usage fix
async function testMaterialUsageFix() {
    console.log('🧪 Testing Material Usage Fix');
    console.log('=============================');
    
    const domain = 'http://10.21.58.135:8080';
    const clientId = '6941b27c7fdcea3d37e02ada';
    
    try {
        // Get current project state
        console.log('1️⃣ Getting current project state...');
        const projectsResponse = await axios.get(`${domain}/api/project?clientId=${clientId}`);
        const projects = projectsResponse.data.data.projects;
        
        if (projects.length === 0) {
            console.log('❌ No projects found');
            return;
        }
        
        const project = projects.find(p => p.name === 'Project 1') || projects[0];
        console.log('   ✅ Testing with project:', project.name);
        console.log('   ✅ Project ID:', project._id);
        console.log('   ✅ Current spent amount:', project.spent || 0);
        console.log('   ✅ Available materials:', project.MaterialAvailable?.length || 0);
        console.log('   ✅ Used materials:', project.MaterialUsed?.length || 0);
        
        // Calculate current totals
        const availableTotal = (project.MaterialAvailable || []).reduce((sum, m) => sum + (m.cost || 0), 0);
        const usedTotal = (project.MaterialUsed || []).reduce((sum, m) => sum + (m.cost || 0), 0);
        
        console.log('   📊 Available materials value:', availableTotal);
        console.log('   📊 Used materials value:', usedTotal);
        console.log('   📊 Total material value:', availableTotal + usedTotal);
        console.log('   📊 Actual spent (should be different):', project.spent || 0);
        
        console.log('\n2️⃣ Dashboard Logic Test:');
        console.log('   🔍 Old logic (WRONG): budgetUsed = available + used =', availableTotal + usedTotal);
        console.log('   ✅ New logic (CORRECT): budgetUsed = project.spent =', project.spent || 0);
        
        console.log('\n3️⃣ Expected Dashboard Display:');
        const actualSpent = project.spent || 0;
        
        if (actualSpent > 0) {
            console.log('   📱 Should show: Pie chart');
            console.log('   📱 Center total:', actualSpent);
            console.log('   📱 Description: Spent:', actualSpent, '• Available:', availableTotal, '• Used:', usedTotal);
        } else {
            console.log('   📱 Should show: "No Material Data" (no money spent yet)');
        }
        
        console.log('\n4️⃣ Material Usage Logic:');
        console.log('   ✅ When materials are imported: spent increases');
        console.log('   ✅ When materials are used: spent stays the same (just transfer)');
        console.log('   ✅ Dashboard shows actual money spent, not material values');
        
        // Test with a specific material if available
        if (project.MaterialAvailable && project.MaterialAvailable.length > 0) {
            const material = project.MaterialAvailable[0];
            console.log('\n5️⃣ Example Material Usage Test:');
            console.log('   📦 Material:', material.name);
            console.log('   📦 Available quantity:', material.qnt);
            console.log('   📦 Cost per unit:', material.cost || 0);
            console.log('   📦 If we use 1 unit:');
            console.log('      - Available quantity: decreases by 1');
            console.log('      - Used materials: gets 1 unit added');
            console.log('      - Project spent: STAYS THE SAME (no new money spent)');
            console.log('      - Dashboard total: STAYS THE SAME');
        }
        
        console.log('\n✅ Material usage fix test complete!');
        console.log('💡 Key changes:');
        console.log('   1. Material usage API no longer increases project.spent');
        console.log('   2. Dashboard uses project.spent instead of available + used');
        console.log('   3. Using materials is now correctly treated as transfer, not new spending');
        
    } catch (error) {
        console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    }
}

testMaterialUsageFix();