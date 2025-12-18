// Test to reproduce the cost calculation bug
function testCostBugReproduction() {
    console.log('🐛 Reproducing Cost Calculation Bug');
    console.log('===================================');
    
    // Test different scenarios that might cause the bug
    
    console.log('\n📋 Scenario 1: Normal material data');
    const scenario1 = {
        name: 'Brick',
        unit: 'pieces',
        totalQuantity: 100,
        totalCost: 5000,
        variants: [
            { _id: '1', quantity: 100, cost: 5000, specs: {} }
        ]
    };
    
    const perUnit1 = scenario1.totalQuantity > 0 
        ? (scenario1.totalCost / scenario1.totalQuantity) 
        : 0;
    
    console.log(`   totalQuantity: ${scenario1.totalQuantity}`);
    console.log(`   totalCost: ${scenario1.totalCost}`);
    console.log(`   Per Unit: ₹${perUnit1.toFixed(2)}/${scenario1.unit}`);
    console.log(`   Total: ₹${scenario1.totalCost.toLocaleString('en-IN')}`);
    console.log(`   Result: ${perUnit1 === 50 ? '✅ Correct' : '❌ Wrong'}`);
    
    console.log('\n📋 Scenario 2: Zero quantity (might cause ₹0/pieces)');
    const scenario2 = {
        name: 'Brick',
        unit: 'pieces',
        totalQuantity: 0,
        totalCost: 5000,
        variants: []
    };
    
    const perUnit2 = scenario2.totalQuantity > 0 
        ? (scenario2.totalCost / scenario2.totalQuantity) 
        : 0;
    
    console.log(`   totalQuantity: ${scenario2.totalQuantity}`);
    console.log(`   totalCost: ${scenario2.totalCost}`);
    console.log(`   Per Unit: ₹${perUnit2}/${scenario2.unit}`);
    console.log(`   Total: ₹${scenario2.totalCost.toLocaleString('en-IN')}`);
    console.log(`   Result: ${perUnit2 === 0 ? '⚠️ Shows ₹0/pieces (this might be the bug!)' : '❌ Unexpected'}`);
    
    console.log('\n📋 Scenario 3: Swapped values (totalCost and totalQuantity mixed up)');
    const scenario3 = {
        name: 'Brick',
        unit: 'pieces',
        totalQuantity: 5000,  // Wrong: this should be quantity, not cost
        totalCost: 100,       // Wrong: this should be cost, not quantity
        variants: []
    };
    
    const perUnit3 = scenario3.totalQuantity > 0 
        ? (scenario3.totalCost / scenario3.totalQuantity) 
        : 0;
    
    console.log(`   totalQuantity: ${scenario3.totalQuantity} (suspicious - too high)`);
    console.log(`   totalCost: ${scenario3.totalCost} (suspicious - too low)`);
    console.log(`   Per Unit: ₹${perUnit3.toFixed(4)}/${scenario3.unit}`);
    console.log(`   Total: ₹${scenario3.totalCost.toLocaleString('en-IN')}`);
    console.log(`   Result: ⚠️ Per unit is very small, total is very small - values might be swapped!`);
    
    console.log('\n📋 Scenario 4: Undefined/null values');
    const scenario4 = {
        name: 'Brick',
        unit: 'pieces',
        totalQuantity: undefined,
        totalCost: null,
        variants: []
    };
    
    const perUnit4 = (scenario4.totalQuantity || 0) > 0 
        ? ((scenario4.totalCost || 0) / (scenario4.totalQuantity || 1)) 
        : 0;
    
    console.log(`   totalQuantity: ${scenario4.totalQuantity}`);
    console.log(`   totalCost: ${scenario4.totalCost}`);
    console.log(`   Per Unit: ₹${perUnit4}/${scenario4.unit}`);
    console.log(`   Total: ₹${(scenario4.totalCost || 0).toLocaleString('en-IN')}`);
    console.log(`   Result: ⚠️ Undefined/null values cause ₹0 display`);
    
    console.log('\n📋 Scenario 5: String values instead of numbers');
    const scenario5 = {
        name: 'Brick',
        unit: 'pieces',
        totalQuantity: '100',  // String instead of number
        totalCost: '5000',     // String instead of number
        variants: []
    };
    
    const perUnit5 = (Number(scenario5.totalQuantity) || 0) > 0 
        ? (Number(scenario5.totalCost) || 0) / (Number(scenario5.totalQuantity) || 1)
        : 0;
    
    console.log(`   totalQuantity: "${scenario5.totalQuantity}" (string)`);
    console.log(`   totalCost: "${scenario5.totalCost}" (string)`);
    console.log(`   Per Unit: ₹${perUnit5.toFixed(2)}/${scenario5.unit}`);
    console.log(`   Total: ₹${Number(scenario5.totalCost).toLocaleString('en-IN')}`);
    console.log(`   Result: ${perUnit5 === 50 ? '✅ Works with string conversion' : '❌ String conversion failed'}`);
    
    console.log('\n🎯 Most Likely Causes of the Bug:');
    console.log('   1. ❌ Zero totalQuantity → shows ₹0/pieces');
    console.log('   2. ❌ Swapped totalCost and totalQuantity values');
    console.log('   3. ❌ Undefined/null values in data');
    console.log('   4. ❌ String values instead of numbers');
    console.log('   5. ❌ Incorrect grouping logic in details.tsx');
    
    console.log('\n🔧 Debugging Steps:');
    console.log('   1. Check actual material data being passed to component');
    console.log('   2. Add console.log in MaterialCardEnhanced to see values');
    console.log('   3. Verify grouping logic in details.tsx');
    console.log('   4. Check API response structure');
    
    console.log('\n✅ Bug reproduction test complete!');
}

testCostBugReproduction();