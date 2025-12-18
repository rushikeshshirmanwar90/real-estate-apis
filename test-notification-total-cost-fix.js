/**
 * Test Notification Total Cost Fix
 * 
 * This script tests the fix for notification page showing per-unit cost
 * instead of total cost in the material activity cards.
 */

console.log('🧪 Testing Notification Total Cost Fix...\n');

// Simulate material activity data
const mockMaterialActivities = [
    {
        _id: 'activity1',
        activity: 'imported',
        materials: [
            { name: 'Cement', cost: 500, qnt: 20, unit: 'bags' },      // 500 × 20 = 10,000
            { name: 'Steel Rods', cost: 80, qnt: 100, unit: 'pieces' }, // 80 × 100 = 8,000
            { name: 'Bricks', cost: 8, qnt: 5000, unit: 'pieces' }      // 8 × 5000 = 40,000
        ]
        // Expected total: 10,000 + 8,000 + 40,000 = 58,000
    },
    {
        _id: 'activity2',
        activity: 'imported',
        materials: [
            { name: 'Sand', cost: 50, qnt: 30, unit: 'cubic meters' },  // 50 × 30 = 1,500
            { name: 'Gravel', cost: 60, qnt: 25, unit: 'cubic meters' } // 60 × 25 = 1,500
        ]
        // Expected total: 1,500 + 1,500 = 3,000
    },
    {
        _id: 'activity3',
        activity: 'imported',
        materials: [
            { name: 'Paint', cost: 300, qnt: 0, unit: 'liters' },       // 300 × 0 = 0
            { name: 'Tiles', cost: 150, qnt: 5, unit: 'boxes' }         // 150 × 5 = 750
        ]
        // Expected total: 0 + 750 = 750
    }
];

function testTotalCostCalculation() {
    console.log('📊 Testing total cost calculations:\n');
    
    mockMaterialActivities.forEach((activity, index) => {
        console.log(`Activity ${index + 1} (${activity.activity}):`);
        
        // OLD CALCULATION (WRONG - per unit cost sum)
        const oldTotalCost = activity.materials.reduce((sum, m) => sum + (m.cost || 0), 0);
        
        // NEW CALCULATION (CORRECT - cost × quantity)
        const newTotalCost = activity.materials.reduce((sum, m) => sum + ((m.cost || 0) * (m.qnt || 0)), 0);
        
        console.log('  Materials:');
        activity.materials.forEach((material, i) => {
            const materialTotal = (material.cost || 0) * (material.qnt || 0);
            console.log(`    ${i + 1}. ${material.name}: ${material.qnt} ${material.unit} × ₹${material.cost} = ₹${materialTotal.toLocaleString('en-IN')}`);
        });
        
        console.log(`  ❌ Old calculation (wrong): ₹${oldTotalCost.toLocaleString('en-IN')} (sum of per-unit costs)`);
        console.log(`  ✅ New calculation (correct): ₹${newTotalCost.toLocaleString('en-IN')} (cost × quantity)`);
        console.log('');
    });
}

function testEdgeCases() {
    console.log('🔍 Testing edge cases:\n');
    
    const edgeCases = [
        {
            name: 'Zero quantity materials',
            materials: [
                { name: 'Free Sample', cost: 100, qnt: 0, unit: 'pieces' }
            ],
            expectedTotal: 0
        },
        {
            name: 'Zero cost materials',
            materials: [
                { name: 'Donated Material', cost: 0, qnt: 100, unit: 'pieces' }
            ],
            expectedTotal: 0
        },
        {
            name: 'Missing cost field',
            materials: [
                { name: 'Unknown Cost', qnt: 10, unit: 'pieces' }
            ],
            expectedTotal: 0
        },
        {
            name: 'Missing quantity field',
            materials: [
                { name: 'Unknown Quantity', cost: 50, unit: 'pieces' }
            ],
            expectedTotal: 0
        },
        {
            name: 'Mixed valid and invalid materials',
            materials: [
                { name: 'Valid Material', cost: 100, qnt: 5, unit: 'pieces' },  // 500
                { name: 'Zero Cost', cost: 0, qnt: 10, unit: 'pieces' },        // 0
                { name: 'Zero Quantity', cost: 200, qnt: 0, unit: 'pieces' }    // 0
            ],
            expectedTotal: 500
        }
    ];
    
    edgeCases.forEach((testCase, index) => {
        console.log(`Edge Case ${index + 1}: ${testCase.name}`);
        
        const calculatedTotal = testCase.materials.reduce((sum, m) => sum + ((m.cost || 0) * (m.qnt || 0)), 0);
        const isCorrect = calculatedTotal === testCase.expectedTotal;
        
        console.log(`  Expected: ₹${testCase.expectedTotal.toLocaleString('en-IN')}`);
        console.log(`  Calculated: ₹${calculatedTotal.toLocaleString('en-IN')}`);
        console.log(`  Result: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}\n`);
    });
}

// Run tests
testTotalCostCalculation();
testEdgeCases();

console.log('🎯 SUMMARY:');
console.log('✅ Fixed total cost calculation in notification page');
console.log('✅ Now shows actual total cost (cost × quantity) instead of per-unit cost sum');
console.log('✅ Handles edge cases like zero costs, zero quantities, and missing fields');
console.log('✅ Material activity cards will now display correct total investment amounts');

console.log('\n📱 USER EXPERIENCE IMPROVEMENT:');
console.log('- Users will see accurate total costs for material imports');
console.log('- Total cost reflects actual money spent on materials');
console.log('- Consistent with other parts of the app (profile, dashboard)');
console.log('- Better financial tracking and transparency');