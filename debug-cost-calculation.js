// Debug cost calculation issue
function debugCostCalculation() {
    console.log('🐛 Debugging Cost Calculation Issue');
    console.log('===================================');
    
    // Simulate API data structure
    const apiMaterial = {
        _id: '6741b27c7fdcea3d37e02ada',
        name: 'Brick',
        qnt: 100,        // quantity
        unit: 'pieces',
        cost: 5000,      // TOTAL cost for 100 pieces (₹50 per piece)
        specs: { type: 'Red Clay' }
    };
    
    console.log('📦 API Material Data:');
    console.log(`   Name: ${apiMaterial.name}`);
    console.log(`   Quantity: ${apiMaterial.qnt} ${apiMaterial.unit}`);
    console.log(`   Total Cost: ₹${apiMaterial.cost}`);
    console.log(`   Expected Per Unit: ₹${apiMaterial.cost / apiMaterial.qnt}/${apiMaterial.unit}`);
    
    // Transform to Material interface (like in details.tsx)
    const transformedMaterial = {
        id: 1,
        _id: apiMaterial._id,
        name: apiMaterial.name,
        quantity: apiMaterial.qnt,     // 100
        unit: apiMaterial.unit,        // 'pieces'
        price: apiMaterial.cost || 0,  // 5000 (TOTAL cost, not per unit!)
        date: new Date().toLocaleDateString(),
        specs: apiMaterial.specs || {}
    };
    
    console.log('\n🔄 Transformed Material:');
    console.log(`   quantity: ${transformedMaterial.quantity}`);
    console.log(`   price: ${transformedMaterial.price} (this is TOTAL cost)`);
    console.log(`   Expected per unit: ₹${transformedMaterial.price / transformedMaterial.quantity}`);
    
    // Grouping logic (like in details.tsx)
    const grouped = {
        totalQuantity: 0,
        totalCost: 0,
        variants: []
    };
    
    // Add material to group
    grouped.variants.push({
        _id: transformedMaterial._id,
        specs: transformedMaterial.specs,
        quantity: transformedMaterial.quantity,  // 100
        cost: transformedMaterial.price,         // 5000 (TOTAL cost)
    });
    
    grouped.totalQuantity += transformedMaterial.quantity;  // 100
    grouped.totalCost += transformedMaterial.price;         // 5000
    
    console.log('\n📊 Grouped Material:');
    console.log(`   totalQuantity: ${grouped.totalQuantity}`);
    console.log(`   totalCost: ${grouped.totalCost}`);
    
    // Cost calculations (like in MaterialCardEnhanced)
    const perUnitCost = grouped.totalQuantity > 0 
        ? (grouped.totalCost / grouped.totalQuantity)
        : 0;
    
    console.log('\n💰 Cost Calculations:');
    console.log(`   Per Unit Cost: ₹${perUnitCost.toFixed(2)}/${transformedMaterial.unit}`);
    console.log(`   Total Cost: ₹${grouped.totalCost.toLocaleString('en-IN')}`);
    
    console.log('\n🎯 Expected vs Actual:');
    console.log(`   Expected Per Unit: ₹50.00/pieces`);
    console.log(`   Actual Per Unit: ₹${perUnitCost.toFixed(2)}/pieces`);
    console.log(`   Expected Total: ₹5,000`);
    console.log(`   Actual Total: ₹${grouped.totalCost.toLocaleString('en-IN')}`);
    
    if (perUnitCost === 50 && grouped.totalCost === 5000) {
        console.log('\n✅ Cost calculations are CORRECT!');
        console.log('The issue might be in the data or display logic.');
    } else {
        console.log('\n❌ Cost calculations are WRONG!');
        console.log('There is a bug in the calculation logic.');
    }
    
    // Test edge cases
    console.log('\n🧪 Testing Edge Cases:');
    
    // Case 1: Zero quantity
    console.log('\n   Case 1: Zero quantity');
    const zeroQuantity = 0;
    const zeroCost = 0;
    const zeroPerUnit = zeroQuantity > 0 ? (zeroCost / zeroQuantity) : 0;
    console.log(`   Quantity: ${zeroQuantity}, Cost: ${zeroCost}`);
    console.log(`   Per Unit: ₹${zeroPerUnit}/pieces`);
    console.log(`   Result: ${zeroPerUnit === 0 ? '✅ Correct (₹0)' : '❌ Wrong'}`);
    
    // Case 2: Very small numbers
    console.log('\n   Case 2: Small numbers');
    const smallQuantity = 1;
    const smallCost = 50;
    const smallPerUnit = smallQuantity > 0 ? (smallCost / smallQuantity) : 0;
    console.log(`   Quantity: ${smallQuantity}, Cost: ${smallCost}`);
    console.log(`   Per Unit: ₹${smallPerUnit}/pieces`);
    console.log(`   Result: ${smallPerUnit === 50 ? '✅ Correct (₹50)' : '❌ Wrong'}`);
    
    console.log('\n✅ Debug complete!');
}

debugCostCalculation();