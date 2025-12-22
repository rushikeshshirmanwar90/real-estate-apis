const { default: fetch } = require('node-fetch');

async function testAPIPDFConsistency() {
    try {
        console.log('\n========================================');
        console.log('🔍 TESTING API-PDF CONSISTENCY');
        console.log('========================================');

        const clientId = '6941b27c7fdcea3d37e02ada';
        const url = `http://localhost:8080/api/material-activity-report?clientId=${clientId}`;
        
        console.log(`📋 Testing URL: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.data.activities.length > 0) {
            console.log('\n📊 API CALCULATION (for notifications):');
            console.log('========================================');
            console.log(`  - API Summary Total: ₹${data.data.summary.totalCost.toLocaleString('en-IN')}`);
            console.log(`  - Total Activities: ${data.data.activities.length}`);
            console.log(`  - Total Materials: ${data.data.summary.totalMaterials}`);
            
            // Manual calculation using API data (simulating PDF logic)
            console.log('\n📄 PDF CALCULATION (using same data):');
            console.log('========================================');
            
            let pdfTotal = 0;
            let activityCount = 0;
            
            data.data.activities.forEach((activity, index) => {
                let activityTotal = 0;
                
                activity.materials.forEach(material => {
                    // Handle different cost structures based on activity type
                    const costValue = Number(material.cost) || 0;
                    const quantity = Number(material.qnt) || 0;
                    
                    let materialTotalCost = 0;
                    
                    if (activity.activity === 'imported') {
                        // For IMPORTED: cost field contains per-unit cost, multiply by quantity
                        materialTotalCost = costValue * quantity;
                    } else {
                        // For USED: cost field contains total cost, use as-is
                        materialTotalCost = costValue;
                    }
                    
                    activityTotal += materialTotalCost;
                });
                
                pdfTotal += activityTotal;
                activityCount++;
                
                // Show first few activities for verification
                if (index < 3) {
                    console.log(`  Activity ${index + 1}: ${activity.activity} - ₹${activityTotal.toLocaleString('en-IN')}`);
                    activity.materials.forEach((material, matIndex) => {
                        const costValue = Number(material.cost) || 0;
                        const quantity = Number(material.qnt) || 1;
                        
                        let perUnitCost = 0;
                        let materialTotalCost = 0;
                        
                        if (activity.activity === 'imported') {
                            perUnitCost = costValue;
                            materialTotalCost = costValue * quantity;
                        } else {
                            materialTotalCost = costValue;
                            perUnitCost = quantity > 0 ? costValue / quantity : 0;
                        }
                        
                        console.log(`    ${matIndex + 1}. ${material.name}: ${quantity} × ₹${perUnitCost.toLocaleString('en-IN')} = ₹${materialTotalCost.toLocaleString('en-IN')}`);
                    });
                }
            });
            
            console.log(`  - PDF Calculated Total: ₹${pdfTotal.toLocaleString('en-IN')}`);
            console.log(`  - PDF Activities Processed: ${activityCount}`);
            
            // Consistency check
            console.log('\n🔍 CONSISTENCY CHECK:');
            console.log('========================================');
            
            const difference = Math.abs(data.data.summary.totalCost - pdfTotal);
            const isConsistent = difference < 0.01; // Allow for small floating point differences
            
            console.log(`  - API Total: ₹${data.data.summary.totalCost.toLocaleString('en-IN')}`);
            console.log(`  - PDF Total: ₹${pdfTotal.toLocaleString('en-IN')}`);
            console.log(`  - Difference: ₹${difference.toLocaleString('en-IN')}`);
            console.log(`  - Consistent: ${isConsistent ? '✅ YES' : '❌ NO'}`);
            
            if (isConsistent) {
                console.log('\n✅ SUCCESS: API and PDF calculations are consistent!');
                console.log('   - Notification page will show correct totals');
                console.log('   - PDF reports will show correct totals');
                console.log('   - Both use the same calculation logic');
            } else {
                console.log('\n❌ ERROR: API and PDF calculations are inconsistent!');
                console.log('   - This will cause confusion for users');
                console.log('   - Need to fix calculation logic');
            }
            
            // Test with specific project filter
            console.log('\n📊 TESTING PROJECT FILTERING CONSISTENCY:');
            console.log('========================================');
            
            const projectFilterUrl = `${url}&projectId=69462b89a87a0ef600e5e7d2`;
            const projectResponse = await fetch(projectFilterUrl);
            const projectData = await projectResponse.json();
            
            if (projectData.success) {
                // Calculate PDF total for filtered data with correct logic
                let filteredPDFTotal = 0;
                projectData.data.activities.forEach(activity => {
                    activity.materials.forEach(material => {
                        const costValue = Number(material.cost) || 0;
                        const quantity = Number(material.qnt) || 0;
                        
                        if (activity.activity === 'imported') {
                            // For IMPORTED: cost field contains per-unit cost, multiply by quantity
                            filteredPDFTotal += (costValue * quantity);
                        } else {
                            // For USED: cost field contains total cost, use as-is
                            filteredPDFTotal += costValue;
                        }
                    });
                });
                
                const filteredDifference = Math.abs(projectData.data.summary.totalCost - filteredPDFTotal);
                const filteredConsistent = filteredDifference < 0.01;
                
                console.log(`  - Filtered API Total: ₹${projectData.data.summary.totalCost.toLocaleString('en-IN')}`);
                console.log(`  - Filtered PDF Total: ₹${filteredPDFTotal.toLocaleString('en-IN')}`);
                console.log(`  - Filtered Activities: ${projectData.data.activities.length}`);
                console.log(`  - Filtered Consistent: ${filteredConsistent ? '✅ YES' : '❌ NO'}`);
            }
            
        } else {
            console.log('❌ No activities found or API error');
        }
        
        console.log('\n========================================');

    } catch (error) {
        console.error('❌ Error testing API-PDF consistency:', error);
    }
}

// Run the test
testAPIPDFConsistency().catch(console.error);