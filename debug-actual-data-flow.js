// Debug the actual data flow to understand the cost calculation issue
function debugActualDataFlow() {
    console.log('🔍 Debugging Actual Data Flow');
    console.log('=============================');
    
    // Let's trace the exact data transformation
    console.log('\n📡 Step 1: API Response Structure');
    const apiResponse = {
        success: true,
        MaterialAvailable: [
            {
                _id: '6741b27c7fdcea3d37e02ada',
                name: 'Brick',
                qnt: 100,        // Quantity imported
                unit: 'pieces',
                cost: 5000,      // TOTAL cost for 100 pieces (₹50 per piece)
                specs: { type: 'Red Clay' }
            }
        ]
    };
    
    console.log('API Material:');
    console.log(`   name: ${apiResponse.MaterialAvailable[0].name}`);
    console.log(`   qnt: ${apiResponse.MaterialAvailable[0].qnt} (quantity)`);
    console.log(`   cost: ${apiResponse.MaterialAvailable[0].cost} (TOTAL cost for ${apiResponse.MaterialAvailable[0].qnt} pieces)`);
    console.log(`   Expected per unit: ₹${apiResponse.MaterialAvailable[0].cost / apiResponse.MaterialAvailable[0].qnt}`);
    
    console.log('\n🔄 Step 2: Transformation to Material Interface');
    const transformedMaterial = {
        id: 1,
        _id: apiResponse.MaterialAvailable[0]._id,
        name: apiResponse.MaterialAvailable[0].name,
        quantity: apiResponse.MaterialAvailable[0].qnt,     // 100
        unit: apiResponse.MaterialAvailable[0].unit,        // 'pieces'
        price: apiResponse.MaterialAvailable[0].cost || 0,  // 5000 (TOTAL cost!)
        specs: apiResponse.MaterialAvailable[0].specs || {}
    };
    
    console.log('Transformed Material:');
    console.log(`   quantity: ${transformedMaterial.quantity}`);
    console.log(`   price: ${transformedMaterial.price} (this is TOTAL cost, not per unit!)`);
    
    console.log('\n📊 Step 3: Grouping Logic');
    const grouped = {
        name: transformedMaterial.name,
        unit: transformedMaterial.unit,
        specs: transformedMaterial.specs,
        variants: [],
        totalQuantity: 0,
        totalCost: 0,
    };
    
    // This is what happens in the grouping logic
    grouped.variants.push({
        _id: transformedMaterial._id,
        specs: transformedMaterial.specs,
        quantity: transformedMaterial.quantity,  // 100
        cost: transformedMaterial.price,         // 5000 (TOTAL cost)
    });
    
    grouped.totalQuantity += transformedMaterial.quantity;  // 100
    grouped.totalCost += transformedMaterial.price;         // 5000
    
    console.log('Grouped Material:');
    console.log(`   totalQuantity: ${grouped.totalQuantity}`);
    console.log(`   totalCost: ${grouped.totalCost}`);
    
    console.log('\n💰 Step 4: Cost Calculation in UI');
    const quantity = Number(grouped.totalQuantity) || 0;
    const cost = Number(grouped.totalCost) || 0;
    const perUnit = quantity > 0 ? (cost / quantity) : 0;
    
    console.log('UI Calculation:');
    console.log(`   quantity: ${quantity}`);
    console.log(`   cost: ${cost}`);
    console.log(`   perUnit: ${perUnit}`);
    console.log(`   Display: ₹${perUnit.toFixed(2)}/${grouped.unit}`);
    
    console.log('\n🎯 Analysis:');
    if (perUnit === 50) {
        console.log('✅ Logic is CORRECT - should show ₹50.00/pieces');
        console.log('❓ If you\'re seeing ₹0/pieces, the issue is likely:');
        console.log('   1. API returning quantity = 0');
        console.log('   2. API returning cost = 0');
        console.log('   3. Data not reaching the component correctly');
        console.log('   4. Multiple materials being grouped incorrectly');
    } else {
        console.log('❌ Logic is WRONG');
    }
    
    console.log('\n🧪 Testing Edge Cases:');
    
    // Case 1: What if API returns per-unit cost instead of total cost?
    console.log('\n   Case 1: API returns per-unit cost (₹50) instead of total cost');
    const wrongApiData = {
        qnt: 100,
        cost: 50  // Per unit cost instead of total cost
    };
    
    const wrongTransformed = {
        quantity: wrongApiData.qnt,  // 100
        price: wrongApiData.cost     // 50 (per unit, not total!)
    };
    
    const wrongGrouped = {
        totalQuantity: wrongTransformed.quantity,  // 100
        totalCost: wrongTransformed.price          // 50 (wrong!)
    };
    
    const wrongPerUnit = wrongGrouped.totalQuantity > 0 
        ? (wrongGrouped.totalCost / wrongGrouped.totalQuantity) 
        : 0;
    
    console.log(`   Wrong calculation: ₹${wrongPerUnit.toFixed(2)}/pieces`);
    console.log(`   ${wrongPerUnit === 0.5 ? '⚠️ This would show ₹0.50/pieces' : ''}`);
    
    // Case 2: What if multiple materials are grouped incorrectly?
    console.log('\n   Case 2: Multiple materials grouped incorrectly');
    const multiMaterials = [
        { quantity: 100, price: 5000 },  // 100 pieces, ₹5000 total
        { quantity: 0, price: 0 }        // 0 pieces, ₹0 total (empty entry)
    ];
    
    let multiTotal = { totalQuantity: 0, totalCost: 0 };
    multiMaterials.forEach(m => {
        multiTotal.totalQuantity += m.quantity;
        multiTotal.totalCost += m.price;
    });
    
    const multiPerUnit = multiTotal.totalQuantity > 0 
        ? (multiTotal.totalCost / multiTotal.totalQuantity) 
        : 0;
    
    console.log(`   Multi-material result: ₹${multiPerUnit.toFixed(2)}/pieces`);
    console.log(`   ${multiPerUnit === 50 ? '✅ Still correct even with empty entries' : '❌ Grouping issue'}`);
    
    console.log('\n✅ Debug complete!');
    console.log('💡 Next steps: Check the actual API response and console logs in the app');
}

debugActualDataFlow();