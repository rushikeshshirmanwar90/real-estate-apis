const axios = require('axios');

// Quick script to add test material usage
async function addTestMaterialUsage() {
    console.log('\n========================================');
    console.log('🧪 ADDING TEST MATERIAL USAGE');
    console.log('========================================');

    const baseURL = 'http://localhost:3000';
    
    // Use the actual IDs from your logs
    const projectId = '6947d14206f922bb666c9dae';
    const clientId = '6947ca5feb038ceeb22be7ee';
    const sectionId = '6947d15e06f922bb666c9dc3';

    try {
        console.log('\n📋 PARAMETERS:');
        console.log('  - Project ID:', projectId);
        console.log('  - Client ID:', clientId);
        console.log('  - Section ID:', sectionId);

        // Step 1: Get available materials
        console.log('\n📦 STEP 1: Getting available materials...');
        
        const availableResponse = await axios.get(`${baseURL}/api/material?projectId=${projectId}&clientId=${clientId}`);
        
        if (!availableResponse.data.success) {
            console.error('❌ Failed to get available materials:', availableResponse.data);
            return;
        }

        const availableMaterials = availableResponse.data.MaterialAvailable || [];
        console.log(`✅ Found ${availableMaterials.length} available materials`);

        if (availableMaterials.length === 0) {
            console.log('\n⚠️ No available materials found!');
            console.log('You need to add materials first using the "Add Material" button in your app.');
            return;
        }

        // Show available materials
        console.log('\n📋 AVAILABLE MATERIALS:');
        availableMaterials.forEach((material, index) => {
            console.log(`  ${index + 1}. ${material.name}`);
            console.log(`     Available: ${material.qnt} ${material.unit}`);
            console.log(`     Per-unit cost: ₹${material.perUnitCost || material.cost || 0}`);
            console.log(`     ID: ${material._id}`);
        });

        // Step 2: Use the first available material
        console.log('\n🔄 STEP 2: Using first available material...');
        
        const materialToUse = availableMaterials[0];
        const usageQuantity = Math.min(5, Math.floor(materialToUse.qnt / 2)); // Use half or 5, whichever is smaller
        
        if (usageQuantity <= 0) {
            console.log('❌ No quantity available to use');
            return;
        }

        console.log(`Using ${usageQuantity} ${materialToUse.unit} of ${materialToUse.name}`);

        const usagePayload = {
            projectId: projectId,
            materialId: materialToUse._id,
            qnt: usageQuantity,
            sectionId: sectionId,
            miniSectionId: null
        };

        console.log('\n📤 USAGE PAYLOAD:');
        console.log(JSON.stringify(usagePayload, null, 2));

        const usageResponse = await axios.post(`${baseURL}/api/material-usage`, usagePayload);
        
        if (!usageResponse.data.success) {
            console.error('❌ Failed to use material:', usageResponse.data);
            console.error('Error details:', usageResponse.data.error);
            return;
        }

        console.log('✅ Material usage successful!');
        console.log('Response:', usageResponse.data.message);

        // Step 3: Verify the usage worked
        console.log('\n📊 STEP 3: Verifying material usage...');
        
        const usedResponse = await axios.get(`${baseURL}/api/material-usage?projectId=${projectId}&clientId=${clientId}`);
        
        if (!usedResponse.data.success) {
            console.error('❌ Failed to fetch used materials:', usedResponse.data);
            return;
        }

        const usedMaterials = usedResponse.data.MaterialUsed || [];
        console.log(`✅ Found ${usedMaterials.length} used materials:`);
        
        if (usedMaterials.length > 0) {
            usedMaterials.forEach((material, index) => {
                console.log(`  ${index + 1}. ${material.name}`);
                console.log(`     Used: ${material.qnt} ${material.unit}`);
                console.log(`     Per-unit cost: ₹${material.perUnitCost || 0}`);
                console.log(`     Total cost: ₹${material.totalCost || 0}`);
                console.log(`     Section ID: ${material.sectionId}`);
            });

            console.log('\n🎉 SUCCESS!');
            console.log('✅ Material usage is now working');
            console.log('✅ Check your app - "Used Materials" tab should show the used material');
            console.log('✅ "Available Materials" tab should show reduced quantity');
        } else {
            console.log('\n❌ ISSUE: No used materials found after usage attempt');
            console.log('This suggests there might be a filtering or saving issue');
        }

        // Step 4: Show updated available materials
        console.log('\n📦 STEP 4: Updated available materials...');
        
        const updatedAvailableResponse = await axios.get(`${baseURL}/api/material?projectId=${projectId}&clientId=${clientId}`);
        const updatedAvailable = updatedAvailableResponse.data.MaterialAvailable || [];
        
        console.log('Updated available materials:');
        updatedAvailable.forEach((material, index) => {
            console.log(`  ${index + 1}. ${material.name}: ${material.qnt} ${material.unit}`);
        });

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
        
        console.error('\nPossible issues:');
        console.error('1. Server is not running (start with: npm run dev)');
        console.error('2. Database connection issues');
        console.error('3. Invalid project/client IDs');
        console.error('4. No materials available to use');
    }

    console.log('\n========================================');
    console.log('🧪 TEST COMPLETED');
    console.log('========================================\n');
}

// Run the script
addTestMaterialUsage().catch(console.error);