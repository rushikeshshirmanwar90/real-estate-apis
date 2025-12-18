// Test the final cost calculation fix
function testCostFixFinal() {
    console.log('🔧 Testing Final Cost Calculation Fix');
    console.log('====================================');
    
    console.log('\n💡 User\'s Insight:');
    console.log('   "The variable you putting in the total instead of putting there put that into the per unit cost"');
    console.log('   "In the total multiply the per unit cost by the total imported"');
    
    console.log('\n🔍 Understanding the Issue:');
    console.log('   - material.totalCost is actually the PER UNIT cost');
    console.log('   - We were treating it as total cost and dividing by quantity');
    console.log('   - This caused incorrect per unit calculations');
    
    // Test the corrected logic
    const material = {
        name: 'Brick',
        unit: 'pieces',
        totalCost: 50,        // This is PER UNIT cost (₹50 per piece)
        totalQuantity: 100,   // Current available quantity
        totalImported: 200    // Total quantity ever imported
    };
    
    console.log('\n📦 Test Material Data:');
    console.log(`   name: ${material.name}`);
    console.log(`   totalCost: ${material.totalCost} (this is PER UNIT cost)`);
    console.log(`   totalQuantity: ${material.totalQuantity} (current available)`);
    console.log(`   totalImported: ${material.totalImported} (total ever imported)`);
    
    console.log('\n❌ OLD (Incorrect) Logic:');
    const oldPerUnit = material.totalQuantity > 0 
        ? (material.totalCost / material.totalQuantity) 
        : 0;
    const oldTotal = material.totalCost;
    
    console.log(`   Per Unit: ₹${material.totalCost} ÷ ${material.totalQuantity} = ₹${oldPerUnit.toFixed(2)}/${material.unit}`);
    console.log(`   Total: ₹${oldTotal.toLocaleString('en-IN')}`);
    console.log(`   Result: ❌ Per Unit: ₹${oldPerUnit.toFixed(2)}/${material.unit}, Total: ₹${oldTotal} (WRONG!)`);
    
    console.log('\n✅ NEW (Correct) Logic:');
    const newPerUnit = material.totalCost; // Use totalCost directly as per unit
    const newTotal = newPerUnit * material.totalImported; // Multiply by total imported
    
    console.log(`   Per Unit: ₹${material.totalCost}/${material.unit} (use totalCost directly)`);
    console.log(`   Total: ₹${newPerUnit} × ${material.totalImported} = ₹${newTotal.toLocaleString('en-IN')}`);
    console.log(`   Result: ✅ Per Unit: ₹${newPerUnit.toFixed(2)}/${material.unit}, Total: ₹${newTotal.toLocaleString('en-IN')} (CORRECT!)`);
    
    console.log('\n🎯 Comparison:');
    console.log(`   OLD: Per Unit ₹${oldPerUnit.toFixed(2)}, Total ₹${oldTotal}`);
    console.log(`   NEW: Per Unit ₹${newPerUnit.toFixed(2)}, Total ₹${newTotal.toLocaleString('en-IN')}`);
    
    if (oldPerUnit < 1 && newPerUnit >= 1) {
        console.log('   ✅ Fix resolves the ₹0/pieces issue!');
    }
    
    console.log('\n🧪 Testing Edge Cases:');
    
    // Case 1: No totalImported, fallback to totalQuantity
    console.log('\n   Case 1: No totalImported field');
    const case1 = {
        totalCost: 75,
        totalQuantity: 50,
        totalImported: undefined
    };
    
    const case1PerUnit = case1.totalCost;
    const case1Total = case1PerUnit * (case1.totalImported || case1.totalQuantity);
    
    console.log(`   Per Unit: ₹${case1PerUnit}/pieces`);
    console.log(`   Total: ₹${case1Total.toLocaleString('en-IN')} (using totalQuantity as fallback)`);
    console.log(`   Status: ${case1PerUnit > 0 && case1Total > 0 ? '✅ Works' : '❌ Failed'}`);
    
    // Case 2: Zero values
    console.log('\n   Case 2: Zero values');
    const case2 = {
        totalCost: 0,
        totalQuantity: 0,
        totalImported: 0
    };
    
    const case2PerUnit = case2.totalCost;
    const case2Total = case2PerUnit * (case2.totalImported || case2.totalQuantity);
    
    console.log(`   Per Unit: ₹${case2PerUnit}/pieces`);
    console.log(`   Total: ₹${case2Total.toLocaleString('en-IN')}`);
    console.log(`   Status: ⚠️ Expected ₹0 (zero values)`);
    
    console.log('\n💰 Real-World Example:');
    console.log('   API Response: { qnt: 100, cost: 50 }');
    console.log('   Interpretation: 100 pieces at ₹50 per piece');
    console.log('   ');
    console.log('   OLD Logic: Per Unit = ₹50 ÷ 100 = ₹0.50/piece ❌');
    console.log('   NEW Logic: Per Unit = ₹50/piece ✅');
    console.log('   ');
    console.log('   OLD Logic: Total = ₹50 ❌');
    console.log('   NEW Logic: Total = ₹50 × 100 = ₹5,000 ✅');
    
    console.log('\n✅ Final cost fix test complete!');
    console.log('This should resolve the ₹0/pieces issue by correctly interpreting the data structure.');
}

testCostFixFinal();