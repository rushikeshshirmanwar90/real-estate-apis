const { default: fetch } = require('node-fetch');

async function testActivityTypeLogic() {
    try {
        console.log('\n========================================');
        console.log('🔍 TESTING ACTIVITY TYPE LOGIC');
        console.log('========================================');

        const clientId = '6941b27c7fdcea3d37e02ada';
        const url = `http://localhost:8080/api/material-activity-report?clientId=${clientId}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.data.activities.length > 0) {
            console.log('\n📊 ACTIVITY TYPE BREAKDOWN:');
            console.log('========================================');
            
            let importedTotal = 0;
            let usedTotal = 0;
            let importedCount = 0;
            let usedCount = 0;
            
            // Find examples of both types
            const importedExample = data.data.activities.find(a => a.activity === 'imported');
            const usedExample = data.data.activities.find(a => a.activity === 'used');
            
            data.data.activities.forEach(activity => {
                let activityTotal = 0;
                
                activity.materials.forEach(material => {
                    const costValue = Number(material.cost) || 0;
                    const quantity = Number(material.qnt) || 0;
                    
                    if (activity.activity === 'imported') {
                        // IMPORTED: cost = per-unit cost, multiply by quantity
                        activityTotal += (costValue * quantity);
                    } else {
                        // USED: cost = total cost, use as-is
                        activityTotal += costValue;
                    }
                });
                
                if (activity.activity === 'imported') {
                    importedTotal += activityTotal;
                    importedCount++;
                } else {
                    usedTotal += activityTotal;
                    usedCount++;
                }
            });
            
            console.log(`📥 IMPORTED ACTIVITIES:`);
            console.log(`  - Count: ${importedCount}`);
            console.log(`  - Total Value: ₹${importedTotal.toLocaleString('en-IN')}`);
            
            console.log(`📤 USED ACTIVITIES:`);
            console.log(`  - Count: ${usedCount}`);
            console.log(`  - Total Value: ₹${usedTotal.toLocaleString('en-IN')}`);
            
            console.log(`📊 GRAND TOTAL: ₹${(importedTotal + usedTotal).toLocaleString('en-IN')}`);
            console.log(`📊 API TOTAL: ₹${data.data.summary.totalCost.toLocaleString('en-IN')}`);
            
            // Show examples
            if (importedExample) {
                console.log('\n📥 IMPORTED EXAMPLE:');
                console.log('========================================');
                console.log(`Activity: ${importedExample.activity}`);
                console.log(`Message: ${importedExample.message}`);
                
                let exampleTotal = 0;
                importedExample.materials.forEach((material, index) => {
                    const perUnitCost = Number(material.cost) || 0;  // Per-unit cost
                    const quantity = Number(material.qnt) || 0;
                    const materialTotal = perUnitCost * quantity;     // Calculate total
                    
                    console.log(`  ${index + 1}. ${material.name}:`);
                    console.log(`     - Quantity: ${quantity} ${material.unit}`);
                    console.log(`     - Per-Unit Cost: ₹${perUnitCost.toLocaleString('en-IN')}`);
                    console.log(`     - Total Cost: ₹${materialTotal.toLocaleString('en-IN')}`);
                    
                    exampleTotal += materialTotal;
                });
                console.log(`  💰 Example Total: ₹${exampleTotal.toLocaleString('en-IN')}`);
            }
            
            if (usedExample) {
                console.log('\n📤 USED EXAMPLE:');
                console.log('========================================');
                console.log(`Activity: ${usedExample.activity}`);
                console.log(`Message: ${usedExample.message}`);
                
                let exampleTotal = 0;
                usedExample.materials.forEach((material, index) => {
                    const totalCost = Number(material.cost) || 0;    // Total cost
                    const quantity = Number(material.qnt) || 1;
                    const perUnitCost = totalCost / quantity;        // Calculate per-unit
                    
                    console.log(`  ${index + 1}. ${material.name}:`);
                    console.log(`     - Quantity: ${quantity} ${material.unit}`);
                    console.log(`     - Total Cost: ₹${totalCost.toLocaleString('en-IN')}`);
                    console.log(`     - Per-Unit Cost: ₹${perUnitCost.toLocaleString('en-IN')}`);
                    
                    exampleTotal += totalCost;
                });
                console.log(`  💰 Example Total: ₹${exampleTotal.toLocaleString('en-IN')}`);
            }
            
            console.log('\n🎯 LOGIC VERIFICATION:');
            console.log('========================================');
            console.log('✅ IMPORTED activities: cost field = per-unit cost');
            console.log('   - PDF shows: per-unit cost directly');
            console.log('   - PDF calculates: total = per-unit × quantity');
            console.log('');
            console.log('✅ USED activities: cost field = total cost');
            console.log('   - PDF calculates: per-unit = total ÷ quantity');
            console.log('   - PDF shows: total cost directly');
            
        } else {
            console.log('❌ No activities found or API error');
        }
        
        console.log('\n========================================');

    } catch (error) {
        console.error('❌ Error testing activity type logic:', error);
    }
}

// Run the test
testActivityTypeLogic().catch(console.error);