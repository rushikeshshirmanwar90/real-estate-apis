const axios = require('axios');

// Complete test script for material flow
async function testCompleteMaterialFlow() {
    console.log('\n========================================');
    console.log('🧪 COMPLETE MATERIAL FLOW TEST');
    console.log('========================================');

    const baseURL = 'http://localhost:3000'; // Adjust if needed
    
    // Replace with your actual IDs
    const projectId = '6947d14206f922bb666c9dae';
    const clientId = '6947ca5feb038ceeb22be7ee';
    const sectionId = '6947d15e06f922bb666c9dc3';

    try {
        console.log('\n📋 TEST PARAMETERS:');
        console.log('  - Base URL:', baseURL);
        console.log('  - Project ID:', projectId);
        console.log('  - Client ID:', clientId);
        console.log('  - Section ID:', sectionId);

        // Step 1: Add test materials
        console.log('\n🔨 STEP 1: Adding test materials...');
        
        const testMaterials = [
            {
                projectId: projectId,
                materialName: 'Test Cement',
                unit: 'bags',
                specs: { grade: 'OPC 43' },
                qnt: 100,
                perUnitCost: 500,
                mergeIfExists: false
            },
            {
                projectId: projectId,
                materialName: 'Test Bricks',
                unit: 'pieces',
                specs: { type: 'red clay' },
                qnt: 1000,
                perUnitCost: 8,
                mergeIfExists: false
            }
        ];

        const addMaterialResponse = await axios.post(`${baseURL}/api/material`, testMaterials);
        
        if (!addMaterialResponse.data.success) {
            console.error('❌ Failed to add materials:', addMaterialResponse.data);
            return;
        }

        console.log('✅ Materials added successfully');
        const addedMaterials = addMaterialResponse.data.results.filter(r => r.success);
        console.log(`Added ${addedMaterials.length} materials:`);
        addedMaterials.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.material.name} - ${result.material.qnt} ${result.material.unit}`);
            console.log(`     ID: ${result.material._id}`);
            console.log(`     Per-unit cost: ₹${result.material.perUnitCost}`);
            console.log(`     Total cost: ₹${result.material.totalCost}`);
        });

        // Step 2: Verify materials are available
        console.log('\n📦 STEP 2: Verifying available materials...');
        
        const availableResponse = await axios.get(`${baseURL}/api/material?projectId=${projectId}&clientId=${clientId}`);
        
        if (!availableResponse.data.success) {
            console.error('❌ Failed to fetch available materials:', availableResponse.data);
            return;
        }

        const availableMaterials = availableResponse.data.MaterialAvailable || [];
        console.log(`✅ Found ${availableMaterials.length} available materials:`);
        
        availableMaterials.forEach((material, index) => {
            console.log(`  ${index + 1}. ${material.name}`);
            console.log(`     Available: ${material.qnt} ${material.unit}`);
            console.log(`     Per-unit cost: ₹${material.perUnitCost || material.cost || 0}`);
            console.log(`     Section ID: ${material.sectionId || 'Global'}`);
            console.log(`     ID: ${material._id}`);
        });

        if (availableMaterials.length === 0) {
            console.log('❌ No available materials found. Cannot proceed with usage test.');
            return;
        }

        // Step 3: Use some materials
        console.log('\n🔄 STEP 3: Using materials...');
        
        const materialToUse = availableMaterials[0];
        const usageQuantity = Math.min(10, materialToUse.qnt);
        
        console.log(`Using ${usageQuantity} ${materialToUse.unit} of ${materialToUse.name}`);

        const usagePayload = {
            projectId: projectId,
            materialId: materialToUse._id,
            qnt: usageQuantity,
            sectionId: sectionId,
            miniSectionId: null
        };

        const usageResponse = await axios.post(`${baseURL}/api/material-usage`, usagePayload);
        
        if (!usageResponse.data.success) {
            console.error('❌ Failed to use material:', usageResponse.data);
            return;
        }

        console.log('✅ Material usage successful');
        console.log('Response:', usageResponse.data.message);

        // Step 4: Verify used materials
        console.log('\n📊 STEP 4: Verifying used materials...');
        
        const usedResponse = await axios.get(`${baseURL}/api/material-usage?projectId=${projectId}&clientId=${clientId}`);
        
        if (!usedResponse.data.success) {
            console.error('❌ Failed to fetch used materials:', usedResponse.data);
            return;
        }

        const usedMaterials = usedResponse.data.MaterialUsed || [];
        console.log(`✅ Found ${usedMaterials.length} used materials:`);
        
        usedMaterials.forEach((material, index) => {
            console.log(`  ${index + 1}. ${material.name}`);
            console.log(`     Used: ${material.qnt} ${material.unit}`);
            console.log(`     Per-unit cost: ₹${material.perUnitCost || 0}`);
            console.log(`     Total cost: ₹${material.totalCost || 0}`);
            console.log(`     Section ID: ${material.sectionId}`);
            console.log(`     Added at: ${material.addedAt || 'N/A'}`);
        });

        // Step 5: Test batch usage
        console.log('\n🔄 STEP 5: Testing batch material usage...');
        
        if (availableMaterials.length >= 2) {
            const batchUsages = [
                {
                    materialId: availableMaterials[0]._id,
                    quantity: Math.min(5, availableMaterials[0].qnt)
                },
                {
                    materialId: availableMaterials[1]._id,
                    quantity: Math.min(3, availableMaterials[1].qnt)
                }
            ];

            const batchPayload = {
                projectId: projectId,
                sectionId: sectionId,
                miniSectionId: null,
                materialUsages: batchUsages,
                clientId: clientId,
                user: {
                    userId: 'test-user',
                    fullName: 'Test User'
                }
            };

            try {
                const batchResponse = await axios.post(`${baseURL}/api/material-usage-batch`, batchPayload);
                
                if (batchResponse.data.success) {
                    console.log('✅ Batch usage successful');
                    console.log('Response:', batchResponse.data.message);
                } else {
                    console.log('⚠️ Batch usage failed:', batchResponse.data.error);
                }
            } catch (batchError) {
                console.log('⚠️ Batch API not available or failed:', batchError.response?.data?.error || batchError.message);
            }
        }

        // Step 6: Final verification
        console.log('\n✅ STEP 6: Final verification...');
        
        const finalUsedResponse = await axios.get(`${baseURL}/api/material-usage?projectId=${projectId}&clientId=${clientId}`);
        const finalAvailableResponse = await axios.get(`${baseURL}/api/material?projectId=${projectId}&clientId=${clientId}`);
        
        const finalUsed = finalUsedResponse.data.MaterialUsed || [];
        const finalAvailable = finalAvailableResponse.data.MaterialAvailable || [];
        
        console.log('\n📊 FINAL RESULTS:');
        console.log(`  - Available materials: ${finalAvailable.length}`);
        console.log(`  - Used materials: ${finalUsed.length}`);
        
        if (finalUsed.length > 0) {
            console.log('\n🎉 SUCCESS! Material usage is working correctly.');
            console.log('Your app should now show materials in both tabs.');
        } else {
            console.log('\n❌ ISSUE: No used materials found after testing.');
            console.log('Check the API logs for errors.');
        }

        // Calculate totals
        const totalAvailableCost = finalAvailable.reduce((sum, m) => sum + (m.totalCost || m.perUnitCost * m.qnt || 0), 0);
        const totalUsedCost = finalUsed.reduce((sum, m) => sum + (m.totalCost || 0), 0);
        
        console.log('\n💰 COST SUMMARY:');
        console.log(`  - Total available value: ₹${totalAvailableCost.toLocaleString('en-IN')}`);
        console.log(`  - Total used value: ₹${totalUsedCost.toLocaleString('en-IN')}`);

    } catch (error) {
        console.error('\n❌ TEST ERROR:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
        
        console.error('\nPossible issues:');
        console.error('1. Server is not running');
        console.error('2. Database connection issues');
        console.error('3. Invalid project/client IDs');
        console.error('4. Schema migration needed');
    }

    console.log('\n========================================');
    console.log('🧪 TEST COMPLETED');
    console.log('========================================\n');
}

// Run the test
testCompleteMaterialFlow().catch(console.error);