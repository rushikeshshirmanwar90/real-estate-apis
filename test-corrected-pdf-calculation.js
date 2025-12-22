const { default: fetch } = require('node-fetch');

async function testCorrectedPDFCalculation() {
    try {
        console.log('\n========================================');
        console.log('🔍 TESTING CORRECTED PDF CALCULATION');
        console.log('========================================');

        const clientId = '6941b27c7fdcea3d37e02ada';
        const url = `http://localhost:8080/api/material-activity-report?clientId=${clientId}`;
        
        console.log(`📋 Testing URL: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.data.activities.length > 0) {
            console.log('\n📊 CORRECTED COST CALCULATION:');
            console.log('========================================');
            
            // Take first few activities as examples
            const sampleActivities = data.data.activities.slice(0, 3);
            
            sampleActivities.forEach((activity, index) => {
                console.log(`\n🔍 Activity ${index + 1}: ${activity.activity.toUpperCase()}`);
                console.log(`  - User: ${activity.user.fullName}`);
                console.log(`  - Date: ${new Date(activity.date).toLocaleDateString()}`);
                console.log(`  - Materials: ${activity.materials.length}`);
                
                let activityTotal = 0;
                
                console.log(`  📦 Materials breakdown (CORRECTED LOGIC):`);
                activity.materials.forEach((material, matIndex) => {
                    // CORRECTED: The cost field contains PER-UNIT cost
                    const perUnitCost = Number(material.cost) || 0;
                    const quantity = Number(material.qnt) || 0;
                    const materialTotalCost = perUnitCost * quantity;  // Calculate total = per-unit × quantity
                    
                    console.log(`    ${matIndex + 1}. ${material.name}`);
                    console.log(`       - Quantity: ${quantity} ${material.unit}`);
                    console.log(`       - Per-Unit Cost (stored): ₹${perUnitCost.toLocaleString('en-IN')}`);
                    console.log(`       - Total Cost (calculated): ₹${materialTotalCost.toLocaleString('en-IN')}`);
                    console.log(`       - Calculation: ${quantity} × ₹${perUnitCost.toLocaleString('en-IN')} = ₹${materialTotalCost.toLocaleString('en-IN')}`);
                    
                    activityTotal += materialTotalCost;
                });
                
                console.log(`  💰 Activity Total: ₹${activityTotal.toLocaleString('en-IN')}`);
            });
            
            // Calculate overall totals with corrected logic
            const correctedGrandTotal = data.data.activities.reduce((sum, activity) => {
                return sum + activity.materials.reduce((matSum, material) => {
                    const perUnitCost = Number(material.cost) || 0;
                    const quantity = Number(material.qnt) || 0;
                    return matSum + (perUnitCost * quantity);
                }, 0);
            }, 0);
            
            // Calculate with old logic for comparison
            const oldLogicTotal = data.data.activities.reduce((sum, activity) => {
                return sum + activity.materials.reduce((matSum, material) => {
                    return matSum + (Number(material.cost) || 0);
                }, 0);
            }, 0);
            
            console.log('\n========================================');
            console.log('📊 CORRECTED PDF TABLE STRUCTURE:');
            console.log('========================================');
            console.log('| Material Name | Quantity | Per Unit Cost | Total Cost |');
            console.log('|---------------|----------|---------------|------------|');
            
            // Show first activity as example with corrected logic
            if (sampleActivities.length > 0) {
                const firstActivity = sampleActivities[0];
                let activityTotal = 0;
                
                firstActivity.materials.forEach(material => {
                    const perUnitCost = Number(material.cost) || 0;
                    const quantity = Number(material.qnt) || 0;
                    const materialTotalCost = perUnitCost * quantity;
                    
                    console.log(`| ${material.name.padEnd(13)} | ${String(quantity + ' ' + material.unit).padEnd(8)} | ₹${perUnitCost.toFixed(2).padStart(11)} | ₹${materialTotalCost.toFixed(2).padStart(9)} |`);
                    activityTotal += materialTotalCost;
                });
                
                console.log('|---------------|----------|---------------|------------|');
                console.log(`| Activity Total|          |               | ₹${activityTotal.toFixed(2).padStart(9)} |`);
            }
            
            console.log('\n========================================');
            console.log('📊 COMPARISON OF CALCULATION METHODS:');
            console.log('========================================');
            console.log(`  - API Summary Total (original): ₹${data.data.summary.totalCost.toLocaleString('en-IN')}`);
            console.log(`  - Old Logic (sum of cost field): ₹${oldLogicTotal.toLocaleString('en-IN')}`);
            console.log(`  - Corrected Logic (qty × per-unit): ₹${correctedGrandTotal.toLocaleString('en-IN')}`);
            console.log(`  - Total Activities: ${data.data.activities.length}`);
            console.log(`  - Total Materials: ${data.data.summary.totalMaterials}`);
            
            console.log('\n📋 LOGIC EXPLANATION:');
            console.log('  - Per-Unit Cost = material.cost (stored value)');
            console.log('  - Total Cost = quantity × per-unit cost');
            console.log('  - Activity Total = sum of all material total costs');
            console.log('  - Grand Total = sum of all activity totals');
            
        } else {
            console.log('❌ No activities found or API error');
        }
        
        console.log('========================================');

    } catch (error) {
        console.error('❌ Error testing corrected PDF calculation:', error);
    }
}

// Run the test
testCorrectedPDFCalculation().catch(console.error);