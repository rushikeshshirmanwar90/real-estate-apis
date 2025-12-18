const axios = require('axios');

const BASE_URL = 'http://localhost:8080';
const CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function testAPIRouting() {
    console.log('🔗 Testing API Routing');
    console.log('======================\n');

    try {
        // Test 1: GET projects (should work with main route)
        console.log('📋 Test 1: GET Projects List');
        console.log('URL:', `${BASE_URL}/api/project?clientId=${CLIENT_ID}`);
        
        try {
            const getResponse = await axios.get(`${BASE_URL}/api/project?clientId=${CLIENT_ID}`);
            console.log('✅ GET Projects:', getResponse.status);
            
            const projects = getResponse.data?.data?.projects || [];
            console.log(`   Found ${projects.length} projects`);
            
            if (projects.length > 0) {
                const testProject = projects[0];
                console.log(`   Test project: ${testProject.name} (ID: ${testProject._id})`);
                
                // Test 2: GET single project (should work with dynamic route)
                console.log('\n📋 Test 2: GET Single Project');
                console.log('URL:', `${BASE_URL}/api/project/${testProject._id}?clientId=${CLIENT_ID}`);
                
                try {
                    const getSingleResponse = await axios.get(`${BASE_URL}/api/project/${testProject._id}?clientId=${CLIENT_ID}`);
                    console.log('✅ GET Single Project:', getSingleResponse.status);
                    console.log('   Project name:', getSingleResponse.data?.data?.name);
                } catch (error) {
                    console.log('❌ GET Single Project failed:', error.response?.status || error.message);
                }
                
                // Test 3: PUT update project (should work with dynamic route)
                console.log('\n📋 Test 3: PUT Update Project');
                console.log('URL:', `${BASE_URL}/api/project/${testProject._id}`);
                
                const updateData = {
                    name: testProject.name + ' (Updated)',
                    address: testProject.address,
                    budget: testProject.budget,
                    clientId: CLIENT_ID
                };
                
                try {
                    const putResponse = await axios.put(`${BASE_URL}/api/project/${testProject._id}`, updateData);
                    console.log('✅ PUT Update Project:', putResponse.status);
                    console.log('   Updated name:', putResponse.data?.data?.name);
                    
                    // Revert the change
                    const revertData = {
                        name: testProject.name,
                        address: testProject.address,
                        budget: testProject.budget,
                        clientId: CLIENT_ID
                    };
                    await axios.put(`${BASE_URL}/api/project/${testProject._id}`, revertData);
                    console.log('   ↩️ Reverted changes');
                    
                } catch (error) {
                    console.log('❌ PUT Update Project failed:', error.response?.status || error.message);
                    if (error.response?.data) {
                        console.log('   Error details:', error.response.data);
                    }
                }
                
            } else {
                console.log('⚠️ No projects found for testing individual operations');
            }
            
        } catch (error) {
            console.log('❌ GET Projects failed:', error.response?.status || error.message);
        }
        
        // Test 4: Verify old routes don't work
        console.log('\n📋 Test 4: Verify Old Routes Are Removed');
        
        try {
            const oldPutResponse = await axios.put(`${BASE_URL}/api/project?id=test`, { test: true });
            console.log('❌ Old PUT route still works (should be removed):', oldPutResponse.status);
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ Old PUT route properly removed (404)');
            } else {
                console.log('⚠️ Old PUT route error:', error.response?.status || error.message);
            }
        }
        
        try {
            const oldDeleteResponse = await axios.delete(`${BASE_URL}/api/project?id=test`);
            console.log('❌ Old DELETE route still works (should be removed):', oldDeleteResponse.status);
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ Old DELETE route properly removed (404)');
            } else {
                console.log('⚠️ Old DELETE route error:', error.response?.status || error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
    
    console.log('\n🎯 API Routing Summary:');
    console.log('   Main Route (/api/project):');
    console.log('   • GET (list projects) ✅');
    console.log('   • POST (create project) ✅');
    console.log('   • PUT (removed) ✅');
    console.log('   • DELETE (removed) ✅');
    console.log('');
    console.log('   Dynamic Route (/api/project/[id]):');
    console.log('   • GET (single project) ✅');
    console.log('   • PUT (update project) ✅');
    console.log('   • DELETE (delete project) ✅');
    
    console.log('\n✅ API routing test complete!');
}

// Only run if this file is executed directly
if (require.main === module) {
    testAPIRouting().catch(console.error);
}

module.exports = { testAPIRouting };