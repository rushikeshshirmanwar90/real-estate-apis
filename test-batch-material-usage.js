const axios = require('axios');

// Test the new batch material usage API
async function testBatchMaterialUsage() {
    const domain = 'http://localhost:3000'; // Adjust as needed
    
    // Sample test data - replace with actual IDs from your database
    const testData = {
        projectId: "YOUR_PROJECT_ID", // Replace with actual project ID
        sectionId: "YOUR_SECTION_ID", // Replace with actual section ID
        miniSectionId: "YOUR_MINI_SECTION_ID", // Replace with actual mini-section ID
        materialUsages: [
            {
                materialId: "MATERIAL_ID_1", // Replace with actual material ID
                quantity: 5
            },
            {
                materialId: "MATERIAL_ID_2", // Replace with actual material ID
                quantity: 10
            }
        ]
    };

    try {
        console.log('🧪 Testing Batch Material Usage API...');
        console.log('Endpoint:', `${domain}/api/material-usage-batch`);
        console.log('Test Data:', JSON.stringify(testData, null, 2));
        
        const response = await axios.post(`${domain}/api/material-usage-batch`, testData);
        
        console.log('\n✅ SUCCESS!');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('\n❌ ERROR!');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data || error.message);
    }
}

// Run the test
testBatchMaterialUsage();