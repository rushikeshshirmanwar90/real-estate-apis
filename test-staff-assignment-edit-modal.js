const axios = require('axios');

const domain = 'http://localhost:3000';
const clientId = '6941b27c7fdcea3d37e02ada';

async function testStaffAssignmentEditModal() {
    console.log('🧪 Testing Staff Assignment in Edit Modal');
    console.log('=====================================\n');

    try {
        // 1. First, get existing projects
        console.log('1️⃣ Fetching existing projects...');
        const projectsResponse = await axios.get(`${domain}/api/project?clientId=${clientId}`);
        
        let projects = [];
        if (projectsResponse.data.success && projectsResponse.data.data) {
            projects = projectsResponse.data.data.projects || [];
        } else {
            projects = Array.isArray(projectsResponse.data) ? projectsResponse.data : [];
        }
        
        console.log(`✅ Found ${projects.length} projects`);
        
        if (projects.length === 0) {
            console.log('❌ No projects found to test edit functionality');
            return;
        }

        const testProject = projects[0];
        console.log(`📝 Using project: ${testProject.name} (ID: ${testProject._id})`);
        console.log(`📝 Current assigned staff: ${testProject.assignedStaff?.length || 0} members`);

        // 2. Get available staff
        console.log('\n2️⃣ Fetching available staff...');
        const staffResponse = await axios.get(`${domain}/api/staff`);
        const staffData = staffResponse.data?.data || [];
        const staffMembers = staffData.map(item => ({
            fullName: `${item.firstName} ${item.lastName}`,
            _id: item._id,
        }));
        
        console.log(`✅ Found ${staffMembers.length} staff members:`);
        staffMembers.forEach(staff => {
            console.log(`   - ${staff.fullName} (${staff._id})`);
        });

        // 3. Test project update with staff assignment changes
        console.log('\n3️⃣ Testing project update with staff changes...');
        
        // Simulate adding/removing staff (for testing, we'll assign first 2 staff members)
        const newAssignedStaff = staffMembers.slice(0, 2);
        
        const updatePayload = {
            name: testProject.name,
            address: testProject.address,
            budget: testProject.budget || 100000,
            description: testProject.description || 'Test project description',
            assignedStaff: newAssignedStaff,
            clientId: clientId,
            user: {
                userId: 'test-user-id',
                fullName: 'Test Admin User',
                email: 'admin@test.com'
            }
        };

        console.log('📝 Update payload:');
        console.log(`   - Name: ${updatePayload.name}`);
        console.log(`   - Address: ${updatePayload.address}`);
        console.log(`   - Budget: ${updatePayload.budget}`);
        console.log(`   - Assigned Staff: ${updatePayload.assignedStaff.length} members`);
        updatePayload.assignedStaff.forEach(staff => {
            console.log(`     * ${staff.fullName}`);
        });

        const updateResponse = await axios.put(
            `${domain}/api/project/${testProject._id}`,
            updatePayload
        );

        console.log(`✅ Project update response: ${updateResponse.status}`);
        console.log('✅ Project updated successfully');

        // 4. Verify the update
        console.log('\n4️⃣ Verifying project update...');
        const verifyResponse = await axios.get(`${domain}/api/project/${testProject._id}`);
        const updatedProject = verifyResponse.data;
        
        console.log('✅ Updated project details:');
        console.log(`   - Name: ${updatedProject.name}`);
        console.log(`   - Assigned Staff: ${updatedProject.assignedStaff?.length || 0} members`);
        if (updatedProject.assignedStaff) {
            updatedProject.assignedStaff.forEach(staff => {
                console.log(`     * ${staff.fullName}`);
            });
        }

        // 5. Check activity logs for staff assignment changes
        console.log('\n5️⃣ Checking activity logs...');
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

        console.log('\n🎉 Staff Assignment Edit Modal Test Completed Successfully!');
        console.log('=====================================');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testStaffAssignmentEditModal();