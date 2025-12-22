const axios = require('axios');

// Test the API without sectionId filtering
async function testApiWithoutSection() {
    console.log('\n========================================');
    console.log('🧪 TESTING API WITHOUT SECTION FILTERING');
    console.log('========================================');

    const baseURL = 'http://localhost:3000';
    
    // Your actual IDs
    const projectId = '6947d14206f922bb666c9dae';
    const clientId = '6947ca5feb038ceeb22be7ee';
    const sectionId = '6947d15e06f922bb666c9dc3';

    try {
        console.log('\n📋 TEST PARAMETERS:');
        console.log('  - Project ID:', projectId);
        console.log('  - Client ID:', clientId);
        console.log('  - Section ID:', sectionId);

        // Test 1: API call WITH sectionId (current failing call)
        console.log('\n🔍 TEST 1: API call WITH sectionId (current call)');
        try {
            const withSectionResponse = await axios.get(`${baseURL}/api/material-usage?projectId=${projectId}&clientId=${clientId}&sectionId=${sectionId}`);
            const withSectionData = withSectionResponse.data;
            
            console.log('✅ API Response (with sectionId):');
            console.log('  - Success:', withSectionData.success);
            console.log('  - MaterialUsed count:', withSectionData.MaterialUsed?.length || 0);
            console.log('  - Message:', withSectionData.message);
            
            if (withSectionData.MaterialUsed && withSectionData.MaterialUsed.length > 0) {
                console.log('  - Sample material:', withSectionData.MaterialUsed[0].name);
            } else {
                console.log('  - ❌ Empty array returned (this is your current issue)');
            }
        } catch (error) {
            console.error('❌ API call with sectionId failed:', error.response?.data || error.message);
        }

        // Test 2: API call WITHOUT sectionId (to see all materials)
        console.log('\n🔍 TEST 2: API call WITHOUT sectionId (to see all materials)');
        try {
            const withoutSectionResponse = await axios.get(`${baseURL}/api/material-usage?projectId=${projectId}&clientId=${clientId}`);
            const withoutSectionData = withoutSectionResponse.data;
            
            console.log('✅ API Response (without sectionId):');
            console.log('  - Success:', withoutSectionData.success);
            console.log('  - MaterialUsed count:', withoutSectionData.MaterialUsed?.length || 0);
            console.log('  - Message:', withoutSectionData.message);
            
            if (withoutSectionData.MaterialUsed && withoutSectionData.MaterialUsed.length > 0) {
                console.log('  - ✅ Materials found without section filtering!');
                console.log('  - Sample materials:');
                withoutSectionData.MaterialUsed.slice(0, 3).forEach((material, index) => {
                    console.log(`    ${index + 1}. ${material.name}`);
                    console.log(`       - Quantity: ${material.qnt} ${material.unit}`);
                    console.log(`       - Section ID: ${material.sectionId || 'NONE'}`);
                    console.log(`       - Mini-section ID: ${material.miniSectionId || 'NONE'}`);
                });
                
                console.log('\n🎯 DIAGNOSIS: Section filtering is the issue!');
                console.log('Materials exist but have different sectionIds than expected.');
                console.log('Solutions:');
                console.log('1. Update materials to have correct sectionId');
                console.log('2. Modify API to handle section mismatches');
                console.log('3. Use materials without section filtering');
            } else {
                console.log('  - ❌ No materials found even without filtering');
                console.log('  - This means no materials have been used yet');
            }
        } catch (error) {
            console.error('❌ API call without sectionId failed:', error.response?.data || error.message);
        }

        // Test 3: Check available materials
        console.log('\n🔍 TEST 3: Check available materials');
        try {
            const availableResponse = await axios.get(`${baseURL}/api/material?projectId=${projectId}&clientId=${clientId}`);
            const availableData = availableResponse.data;
            
            console.log('✅ Available Materials:');
            console.log('  - Success:', availableData.success);
            console.log('  - MaterialAvailable count:', availableData.MaterialAvailable?.length || 0);
            
            if (availableData.MaterialAvailable && availableData.MaterialAvailable.length > 0) {
                console.log('  - ✅ Available materials found!');
                console.log('  - You can use these materials to create used materials');
                console.log('  - Run: node add-test-material-usage.js');
            } else {
                console.log('  - ❌ No available materials found');
                console.log('  - Add materials first using your app');
            }
        } catch (error) {
            console.error('❌ Available materials API failed:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('\n❌ GENERAL ERROR:', error.message);
        console.error('Make sure your server is running on localhost:3000');
    }

    console.log('\n========================================');
    console.log('🧪 API TESTING COMPLETED');
    console.log('========================================\n');
}

// Run the test
testApiWithoutSection().catch(console.error);