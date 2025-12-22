const { default: fetch } = require('node-fetch');

async function testPDFCostCalculation() {
    try {
        console.log('\n========================================');
        console.log('🔍 TESTING PDF COST CALCULATION');
        console.log('========================================');

        const clientId = '6941b27c7fdcea3d37e02ada';
        const url = `http://localhost:8080/api/material-activity-report?clientId=${clientId}`;
        
        console.log(`📋 Testing URL: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.data.activities.length > 0) {
            console.log('\n📊 COST CALCULATION ANALYSIS:');
            console.log('========================================');
            
            // Take first few activities as examples
            const sampleActivities = data.data.activities.slice(0, 3);
            
            sampleActivities.forEach((activity, index) => {
                console.log(`\n🔍 Activity ${index + 1}: ${activity.activity.toUpperCase()}`);
                console.log(`  - User: ${activity.user.fullName}`);
                console.log(`  - Date: ${new Date(activity.date).toLocaleDateString()}`);
                console.log(`  - Materials: ${activity.materials.length}`);
                
                let activityTotal = 0;
                
                console.log(`  📦 Materials breakdown:`);
                activity.materials.forEach((material, matIndex) => {
                    // The cost field contains TOTAL cost (per-unit × quantity)
                    const totalMaterialCost = Number(material.cost) || 0;
                    const quantity = Number(material.qnt) || 1;
                    const perUnitCost = quantity > 0 ? totalMaterialCost / quantity : 0;
                    
                    console.log(`    ${matIndex + 1}. ${material.name}`);
                    console.log(`       - Quantity: ${quantity} ${material.unit}`);
                    console.log(`       - Stored Cost (total): ₹${totalMaterialCost.toLocaleString('en-IN')}`);
                    console.log(`       - Calculated Per-Unit: ₹${perUnitCost.toLocaleString('en-IN')}`);
                    console.log(`       - Verification (per-unit × qty): ₹${(perUnitCost * quantity).toLocaleString('en-IN')}`);
                    console.log(`       - Match: ${Math.abs((perUnitCost * quantity) - totalMaterialCost) < 0.01 ? '✅' : '❌'}`);
                    
                    activityTotal += totalMaterialCost;
                });
                
                console.log(`  💰 Activity Total: ₹${activityTotal.toLocaleString('en-IN')}`);
            });
            
            // Calculate overall totals
            const grandTotal = data.data.activities.reduce((sum, activity) => {
                return sum + activity.materials.reduce((matSum, material) => {
                    return matSum + (Number(material.cost) || 0);
                }, 0);
            }, 0);
            
            console.log('\n========================================');
            console.log('📊 PDF TABLE STRUCTURE PREVIEW:');
            console.log('========================================');
            console.log('| Material Name | Quantity | Per Unit Cost | Total Cost |');
            console.log('|---------------|----------|---------------|------------|');
            
            // Show first activity as example
            if (sampleActivities.length > 0) {
                const firstActivity = sampleActivities[0];
                firstActivity.materials.forEach(material => {
                    const totalMaterialCost = Number(material.cost) || 0;
                    const quantity = Number(material.qnt) || 1;
                    const perUnitCost = quantity > 0 ? totalMaterialCost / quantity : 0;
                    
                    console.log(`| ${material.name.padEnd(13)} | ${String(quantity + ' ' + material.unit).padEnd(8)} | ₹${perUnitCost.toFixed(2).padStart(11)} | ₹${totalMaterialCost.toFixed(2).padStart(9)} |`);
                });
                
                const activityTotal = firstActivity.materials.reduce((sum, mat) => sum + (Number(mat.cost) || 0), 0);
                console.log('|---------------|----------|---------------|------------|');
                console.log(`| Activity Total|          |               | ₹${activityTotal.toFixed(2).padStart(9)} |`);
            }
            
            console.log('\n========================================');
            console.log('📊 FINAL TOTALS:');
            console.log('========================================');
            console.log(`  - API Summary Total: ₹${data.data.summary.totalCost.toLocaleString('en-IN')}`);
            console.log(`  - Manual Calculation: ₹${grandTotal.toLocaleString('en-IN')}`);
            console.log(`  - Match: ${Math.abs(data.data.summary.totalCost - grandTotal) < 0.01 ? '✅' : '❌'}`);
            console.log(`  - Total Activities: ${data.data.activities.length}`);
            console.log(`  - Total Materials: ${data.data.summary.totalMaterials}`);
            
        } else {
            console.log('❌ No activities found or API error');
        }
        
        console.log('========================================');

    } catch (error) {
        console.error('❌ Error testing PDF cost calculation:', error);
    }
}

// Run the test
testPDFCostCalculation().catch(console.error);