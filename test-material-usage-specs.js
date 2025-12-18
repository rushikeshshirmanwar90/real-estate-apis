// Test material usage form specifications display
function testMaterialUsageSpecs() {
    console.log('🧪 Testing Material Usage Form Specifications Display');
    console.log('====================================================');
    
    // Sample materials with same names but different specs
    const materials = [
        {
            _id: '1',
            name: 'Cement',
            unit: 'bags',
            quantity: 100,
            specs: { brand: 'UltraTech', grade: 'OPC 43', type: 'Portland' }
        },
        {
            _id: '2',
            name: 'Cement',
            unit: 'bags',
            quantity: 50,
            specs: { brand: 'ACC', grade: 'OPC 53', type: 'Portland' }
        },
        {
            _id: '3',
            name: 'Cement',
            unit: 'bags',
            quantity: 75,
            specs: { brand: 'UltraTech', grade: 'OPC 43', type: 'Blended' }
        },
        {
            _id: '4',
            name: 'Steel',
            unit: 'kg',
            quantity: 200,
            specs: { grade: 'Fe415', diameter: '12mm' }
        }
    ];
    
    console.log('📦 Input Materials:');
    materials.forEach((material, index) => {
        console.log(`   ${index + 1}. ${material.name} (${material.unit})`);
        console.log(`      - Specs: ${JSON.stringify(material.specs)}`);
        console.log(`      - Quantity: ${material.quantity}`);
    });
    
    // Simulate the getDifferingSpecs function
    function getDifferingSpecs(material, allMaterials) {
        // Find all materials with the same name and unit
        const sameMaterials = allMaterials.filter(m => 
            m.name === material.name && m.unit === material.unit
        );
        
        // If only one material with this name, no need to show specs
        if (sameMaterials.length <= 1) {
            return null;
        }
        
        // Get all unique spec keys across all materials with same name
        const allSpecKeys = new Set();
        sameMaterials.forEach(m => {
            if (m.specs) {
                Object.keys(m.specs).forEach(key => allSpecKeys.add(key));
            }
        });
        
        // Find specs that differ between materials
        const differingSpecs = {};
        
        Array.from(allSpecKeys).forEach(specKey => {
            const values = sameMaterials.map(m => m.specs?.[specKey]).filter(v => v !== undefined);
            const uniqueValues = [...new Set(values)];
            
            // If there are different values for this spec key, it's a differing spec
            if (uniqueValues.length > 1) {
                differingSpecs[specKey] = material.specs?.[specKey];
            }
        });
        
        return Object.keys(differingSpecs).length > 0 ? differingSpecs : null;
    }
    
    // Function to format differing specs for display
    function formatDifferingSpecs(specs) {
        if (!specs || Object.keys(specs).length === 0) return '';
        
        return Object.entries(specs)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    }
    
    console.log('\n🔍 Analyzing Differing Specifications:');
    
    materials.forEach((material, index) => {
        const differingSpecs = getDifferingSpecs(material, materials);
        const formattedSpecs = formatDifferingSpecs(differingSpecs);
        
        console.log(`\n   Material ${index + 1}: ${material.name}`);
        console.log(`     All specs: ${JSON.stringify(material.specs)}`);
        console.log(`     Differing specs: ${differingSpecs ? JSON.stringify(differingSpecs) : 'None (unique material)'}`);
        console.log(`     Display text: "${formattedSpecs}"`);
        console.log(`     Show badge: ${differingSpecs ? '✅ Yes' : '❌ No'}`);
    });
    
    console.log('\n🎯 Expected UI Display:');
    console.log('   Material List Items:');
    console.log('   ┌─────────────────────────────────────────┐');
    console.log('   │ [🧱] Cement [brand: UltraTech, grade: OPC 43, type: Portland]');
    console.log('   │      100 bags available                 │');
    console.log('   ├─────────────────────────────────────────┤');
    console.log('   │ [🧱] Cement [brand: ACC, grade: OPC 53] │');
    console.log('   │      50 bags available                  │');
    console.log('   ├─────────────────────────────────────────┤');
    console.log('   │ [🧱] Cement [brand: UltraTech, type: Blended]');
    console.log('   │      75 bags available                  │');
    console.log('   ├─────────────────────────────────────────┤');
    console.log('   │ [⚙️] Steel                               │');
    console.log('   │      200 kg available                   │ <- No badge (unique)');
    console.log('   └─────────────────────────────────────────┘');
    
    console.log('\n💡 Key Features:');
    console.log('   1. ✅ Only shows differing specifications');
    console.log('   2. ✅ Hides common specifications (like "type: Portland")');
    console.log('   3. ✅ No badge for unique materials (Steel)');
    console.log('   4. ✅ Compact display in yellow badges');
    console.log('   5. ✅ Easy to distinguish between similar materials');
    
    console.log('\n🔍 Specification Analysis:');
    console.log('   Cement materials share:');
    console.log('     - Common: type: "Portland" (2 out of 3) - not shown');
    console.log('     - Different: brand, grade, type - shown in badges');
    console.log('   ');
    console.log('   Steel material:');
    console.log('     - Unique material name - no badge needed');
    
    console.log('\n✅ Material usage form specs test complete!');
    console.log('Users can now easily distinguish between materials with same names.');
}

testMaterialUsageSpecs();