const axios = require('axios');

async function testBuildingAPI() {
    console.log('🧪 Testing Building API');
    console.log('======================');

    const baseURL = 'http://localhost:3000'; // Adjust if different
    const validBuildingIds = [
        '69462b94a87a0ef600e5e7dd', // Building 1
        '69462ecdaa465ff256bc9326', // Building 2
        '6948cf8159cce9f90777b625'  // Tower 1
    ];

    const invalidBuildingId = '69462b94a87a0ef600e5e7df'; // The problematic ID

    console.log('\n📋 Testing valid building IDs:');
    
    for (const buildingId of validBuildingIds) {
        try {
            console.log(`\n🔍 Testing GET /api/building?id=${buildingId}`);
            const response = await axios.get(`${baseURL}/api/building?id=${buildingId}`);
            
            if (response.status === 200) {
                console.log('✅ Success:', response.data.message);
                console.log(`   Building: ${response.data.data.name}`);
                console.log(`   Project ID: ${response.data.data.projectId}`);
            }
        } catch (error) {
            if (error.response) {
                console.log(`❌ Error ${error.response.status}: ${error.response.data?.message || 'Unknown error'}`);
            } else {
                console.log(`❌ Network Error: ${error.message}`);
            }
        }
    }

    console.log('\n📋 Testing invalid building ID:');
    try {
        console.log(`\n🔍 Testing GET /api/building?id=${invalidBuildingId}`);
        const response = await axios.get(`${baseURL}/api/building?id=${invalidBuildingId}`);
        
        if (response.status === 200) {
            console.log('✅ Success (auto-created):', response.data.message);
            console.log(`   Building: ${response.data.data.name}`);
        }
    } catch (error) {
        if (error.response) {
            console.log(`❌ Error ${error.response.status}: ${error.response.data?.message || 'Unknown error'}`);
            if (error.response.status === 404) {
                console.log('   This confirms the 404 error - building does not exist and cannot be auto-created');
            }
        } else {
            console.log(`❌ Network Error: ${error.message}`);
        }
    }

    console.log('\n📝 Recommendations:');
    console.log('1. Check if the building ID in the frontend URL is correct');
    console.log('2. Verify that the building section exists in the project');
    console.log('3. Use one of the valid building IDs for testing');
    console.log('\nValid building IDs:');
    validBuildingIds.forEach(id => console.log(`   - ${id}`));
}

testBuildingAPI()
    .then(() => {
        console.log('\n✅ API test completed!');
    })
    .catch(error => {
        console.error('\n💥 API test failed:', error.message);
    });