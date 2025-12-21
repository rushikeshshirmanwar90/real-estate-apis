const axios = require('axios');

const domain = 'http://localhost:3000';
const clientId = '6941b27c7fdcea3d37e02ada';

async function testStaffAssignmentAPI() {
    console.log('🧪 Testing Staff Assignment/Removal API');
    console.log('=====================================\n');

    try {
        // 1. Get available staff members
        console.log('1️⃣ Fetching available staff members...');
        const staffResponse = await axios.get(`${domain}/api/staff`);
        const staffMembers = staffResponse.data?.data || [];
        
        console.log(`✅ Found ${staffMembers.length} staff members:`);
        staffMembers.slice(0, 3).forEach(staff => {
            console.log(`   - ${staff.firstName} ${staff.lastName} (${staff._id})`);
        });

        if (staffMembers.length === 0) {
            console.log('❌ No staff members found to test assignment');
            return;
        }

        // 2. Get available projects
        console.log('\n2️⃣ Fetching available projects...');
        const projectsResponse = await axios.get(`${domain}/api/project?clientId=${clientId}`);
        
        let projects = [];
        if (projectsResponse.data.success && projectsResponse.data.data) {
            projects = projectsResponse.data.data.projects || [];
        } else {
            projects = Array.isArray(projectsResponse.data) ? projectsResponse.data : [];
        }
        
        console.log(`✅ Found ${projects.length} projects`);
        
        if (projects.length === 0) {
            console.log('❌ No projects found to test staff assignment');
            return;
        }

        const testProject = projects[0];
        const testStaff = staffMembers[0];
        
        console.log(`📝 Using project: ${testProject.name} (ID: ${testProject._id})`);
        console.log(`📝 Using staff: ${testStaff.firstName} ${testStaff.lastName} (ID: ${testStaff._id})`);

        // 3. Test staff assignment via API
        console.log('\n3️⃣ Testing staff assignment via API...');
        
        const assignPayload = {
            staffId: testStaff._id,
            projectId: testProject._id,
            user: {
                userId: 'test-admin-id',
                fullName: 'Test Admin User',
                email: 'admin@test.com'
            },
            message: 'Staff assigned via API test'
        };

        console.log('📝 Assignment payload:');
        console.log(`   - Staff: ${testStaff.firstName} ${testStaff.lastName}`);
        console.log(`   - Project: ${testProject.name}`);

        const assignResponse = await axios.post(
            `${domain}/api/staff?action=assign`,
            assignPayload
        );

        console.log(`✅ Staff assignment response: ${assignResponse.status}`);
        console.log('✅ Assignment details:', assignResponse.data.data);

        // 4. Verify assignment by checking project
        console.log('\n4️⃣ Verifying staff assignment...');
        const verifyResponse = await axios.get(`${domain}/api/project/${testProject._id}`);
        const updatedProject = verifyResponse.data;
        
        console.log('✅ Updated project assigned staff:');
        if (updatedProject.assignedStaff && updatedProject.assignedStaff.length > 0) {
            updatedProject.assignedStaff.forEach(staff => {
                console.log(`   - ${staff.fullName} (${staff._id})`);
            });
        } else {
            console.log('   - No staff assigned');
        }

        // 5. Test staff removal via API
        console.log('\n5️⃣ Testing staff removal via API...');
        
        const removeResponse = await axios.delete(
            `${domain}/api/staff?id=${testStaff._id}&action=remove_assign&projectId=${testProject._id}`
        );

        console.log(`✅ Staff removal response: ${removeResponse.status}`);
        console.log('✅ Removal details:', removeResponse.data.data);

        // 6. Verify removal by checking project again
        console.log('\n6️⃣ Verifying staff removal...');
        const verifyRemovalResponse = await axios.get(`${domain}/api/project/${testProject._id}`);
        const projectAfterRemoval = verifyRemovalResponse.data;
        
        console.log('✅ Project assigned staff after removal:');
        if (projectAfterRemoval.assignedStaff && projectAfterRemoval.assignedStaff.length > 0) {
            projectAfterRemoval.assignedStaff.forEach(staff => {
                console.log(`   - ${staff.fullName} (${staff._id})`);
            });
        } else {
            console.log('   - No staff assigned (removal successful)');
        }

        // 7. Check activity logs
        console.log('\n7️⃣ Checking activity logs...');
        const activityResponse = await axios.get(`${domain}/api/activity?clientId=${clientId}&projectId=${testProject._id}`);
        const activities = activityResponse.data?.data || activityResponse.data || [];
        
        const staffActivities = activities.filter(activity => 
            activity.category === 'staff' && 
            (activity.activityType === 'staff_assigned' || activity.activityType === 'staff_unassigned')
        );
        
        console.log(`✅ Found ${staffActivities.length} staff-related activities:`);
        staffActivities.slice(0, 5).forEach(activity => {
            console.log(`   - ${activity.activityType}: ${activity.description}`);
        });

        console.log('\n🎉 Staff Assignment/Removal API Test Completed Successfully!');
        console.log('=====================================');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Test edge cases
async function testEdgeCases() {
    console.log('\n🧪 Testing Edge Cases');
    console.log('====================\n');

    try {
        // Test invalid staff ID
        console.log('1️⃣ Testing invalid staff ID...');
        try {
            await axios.post(`${domain}/api/staff?action=assign`, {
                staffId: 'invalid-id',
                projectId: '507f1f77bcf86cd799439011'
            });
        } catch (error) {
            console.log(`✅ Invalid staff ID handled: ${error.response.status} - ${error.response.data.message}`);
        }

        // Test invalid project ID
        console.log('\n2️⃣ Testing invalid project ID...');
        try {
            await axios.post(`${domain}/api/staff?action=assign`, {
                staffId: '507f1f77bcf86cd799439011',
                projectId: 'invalid-id'
            });
        } catch (error) {
            console.log(`✅ Invalid project ID handled: ${error.response.status} - ${error.response.data.message}`);
        }

        // Test non-existent staff
        console.log('\n3️⃣ Testing non-existent staff...');
        try {
            await axios.post(`${domain}/api/staff?action=assign`, {
                staffId: '507f1f77bcf86cd799439011',
                projectId: '507f1f77bcf86cd799439012'
            });
        } catch (error) {
            console.log(`✅ Non-existent staff handled: ${error.response.status} - ${error.response.data.message}`);
        }

        console.log('\n✅ Edge cases testing completed');

    } catch (error) {
        console.error('❌ Edge case testing failed:', error.message);
    }
}

// Run the tests
async function runAllTests() {
    await testStaffAssignmentAPI();
    await testEdgeCases();
}

runAllTests();