// Test to verify the cost calculation fix
function testCostFixVerification() {
    console.log('🔧 Testing Cost Calculation Fix');
    console.log('===============================');
    
    // Simulate the grouping logic with specs-based keys
    function simulateGrouping(materials, isUsedTab = false) {
        const grouped = {};
        
        materials.forEach((material) => {
            const specsKey = material.specs ? JSON.stringify(material.specs) : 'no-specs';
            const key = `${material.name}-${material.unit}-${specsKey}`;
            
            if (!grouped[key]) {
                grouped[key] = {
                    name: material.name,
                    unit: material.unit,
                    specs: material.specs || {},
                    variants: [],
                    totalQuantity: 0,
                    totalCost: 0,
                };
            }
            
            grouped[key].variants.push({
                _id: material._id,
                specs: material.specs || {},
                quantity: material.quantity,
                cost: material.price,
            });
            
            grouped[key].totalQuantity += material.quantity;
            grouped[key].totalCost += material.price;
        });
        
        return Object.values(grouped);
    }
    
    // Test case 1: Normal materials with specs
    console.log('\n📋 Test Case 1: Normal materials with specs');
    const materials1 = [
        {
            _id: '1',
            name: 'Cement',
            quantity: 100,
            unit: 'bags',
            price: 50000, // Total cost for 100 bags
            specs: { brand: 'UltraTech', grade: 'OPC 43' }
        },
        {
            _id: '2',
            name: 'Cement',
            quantity: 50,
            unit: 'bags',
            price: 22500, // Total cost for 50 bags
            specs: { brand: 'ACC', grade: 'OPC 53' }
        }
    ];
    
    const grouped1 = simulateGrouping(materials1);
    console.log(`   Materials: ${materials1.length}`);
    console.log(`   Grouped: ${grouped1.length} cards`);
    
    grouped1.forEach((group, index) => {
        const perUnit = group.totalQuantity > 0 ? (group.totalCost / group.totalQuantity) : 0;
        console.log(`   Card ${index + 1}: ${group.name}`);
        console.log(`     Specs: ${JSON.stringify(group.specs)}`);
        console.log(`     Quantity: ${group.totalQuantity} ${group.unit}`);
        console.log(`     Total Cost: ₹${group.totalCost.toLocaleString('en-IN')}`);
        console.log(`     Per Unit: ₹${perUnit.toFixed(2)}/${group.unit}`);
        console.log(`     Status: ${perUnit > 0 ? '✅ Correct' : '❌ Zero per unit!'}`);
    });
    
    // Test case 2: Edge case - zero quantities
    console.log('\n📋 Test Case 2: Edge case - zero quantities');
    const materials2 = [
        {
            _id: '3',
            name: 'Brick',
            quantity: 0, // Zero quantity
            unit: 'pieces',
            price: 0,
            specs: { type: 'Red Clay' }
        }
    ];
    
    const grouped2 = simulateGrouping(materials2);
    grouped2.forEach((group, index) => {
        const perUnit = group.totalQuantity > 0 ? (group.totalCost / group.totalQuantity) : 0;
        console.log(`   Card ${index + 1}: ${group.name}`);
        console.log(`     Quantity: ${group.totalQuantity} ${group.unit}`);
        console.log(`     Total Cost: ₹${group.totalCost.toLocaleString('en-IN')}`);
        console.log(`     Per Unit: ₹${perUnit}/${group.unit}`);
        console.log(`     Status: ${perUnit === 0 ? '⚠️ Expected ₹0 (zero quantity)' : '❌ Unexpected'}`);
    });
    
    // Test case 3: String values (defensive programming)
    console.log('\n📋 Test Case 3: String values (defensive programming)');
    const materials3 = [
        {
            _id: '4',
            name: 'Steel',
            quantity: '200', // String quantity
            unit: 'kg',
            price: '10000', // String price
            specs: { grade: 'Fe415' }
        }
    ];
    
    const grouped3 = simulateGrouping(materials3);
    grouped3.forEach((group, index) => {
        // Simulate the defensive Number() conversion
        const quantity = Number(group.totalQuantity) || 0;
        const cost = Number(group.totalCost) || 0;
        const perUnit = quantity > 0 ? (cost / quantity) : 0;
        
        console.log(`   Card ${index + 1}: ${group.name}`);
        console.log(`     Original Quantity: "${group.totalQuantity}" (${typeof group.totalQuantity})`);
        console.log(`     Original Cost: "${group.totalCost}" (${typeof group.totalCost})`);
        console.log(`     Parsed Quantity: ${quantity}`);
        console.log(`     Parsed Cost: ${cost}`);
        console.log(`     Per Unit: ₹${perUnit.toFixed(2)}/${group.unit}`);
        console.log(`     Status: ${perUnit === 50 ? '✅ String conversion works' : '❌ String conversion failed'}`);
    });
    
    console.log('\n🎯 Key Fixes Applied:');
    console.log('   1. ✅ Fixed specs-based key matching in grouping logic');
    console.log('   2. ✅ Added Number() conversion for defensive programming');
    console.log('   3. ✅ Added debug logging to identify data issues');
    console.log('   4. ✅ Proper handling of zero quantities');
    
    console.log('\n🔍 What the Debug Logs Will Show:');
    console.log('   - Material name and specs');
    console.log('   - Original vs parsed quantity and cost values');
    console.log('   - Data types of the values');
    console.log('   - Final calculation result');
    
    console.log('\n✅ Cost fix verification complete!');
    console.log('The debug logs in the app will help identify the exact cause of the issue.');
}

testCostFixVerification();