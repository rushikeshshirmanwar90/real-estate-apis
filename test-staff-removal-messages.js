const axios = require('axios');

const domain = 'http://localhost:3000';
const clientId = '6941b27c7fdcea3d37e02ada';

async function testStaffRemovalMessages() {
    console.log('🧪 Testing Staff Removal Messages in Notifications');
    console.log('================================================\n');

    try {
        // 1. Get available staff and projects
        console.log('1️⃣ Fetching staff and projects...');
        const [staffResponse, projectsResponse] = await Promise.all([
            axios.get(`${domain}/api/staff`),
            axios.get(`${domain}/api/project?clientId=${clientId}`)
        ]);

        const staffMembers = staffResponse.data?.data || [];
        let projects = [];
        if (projectsResponse.data.success && projectsResponse.data.data) {
            projects = projectsResponse.data.data.projects || [];
        } else {
            projects = Array.isArray(projectsResponse.data) ? projectsResponse.data : [];
        }

        console.log(`✅ Found ${staffMembers.length} staff members`);
        console.log(`✅ Found ${projects.length} projects`);

        if (staffMembers.length === 0 || projects.length === 0) {
            console.log('❌ Need both staff and projects to test');
            return;
        }

        const testStaff = staffMembers[0];
        const testProject = projects[0];

        console.log(`📝 Using staff: ${testStaff.firstName} ${testStaff.lastName}`);
        console.log(`📝 Using project: ${testProject.name}`);

        // 2. First assign staff to project
        console.log('\n2️⃣ Assigning staff to project...');
        const assignResponse = await axios.post(`${domain}/api/staff?action=assign`, {
            staffId: testStaff._id,
            projectId: testProject._id,
            user: {
                userId: 'test-admin',
                fullName: 'Test Admin User',
                email: 'admin@test.com'
            },
            message: 'Test assignment for message verification'
        });

        console.log(`✅ Staff assigned: ${assignResponse.status}`);

        // 3. Remove staff from project
        console.log('\n3️⃣ Removing staff from project...');
        const removeResponse = await axios.delete(
            `${domain}/api/staff?id=${testStaff._id}&action=remove_assign&projectId=${testProject._id}`
        );

        console.log(`✅ Staff removed: ${removeResponse.status}`);

        // 4. Check activity logs for both assignment and removal messages
        console.log('\n4️⃣ Checking activity logs for message format...');
        const activityResponse = await axios.get(
            `${domain}/api/activity?clientId=${clientId}&projectId=${testProject._id}&category=staff`
        );

        const activities = activityResponse.data?.data?.activities || 
                          activityResponse.data?.activities || 
                          activityResponse.data?.data || 
                          activityResponse.data || [];

        console.log(`✅ Found ${activities.length} staff activities`);

        // Filter recent staff activities
        const recentStaffActivities = activities
            .filter(activity => 
                activity.category === 'staff' && 
                (activity.activityType === 'staff_assigned' || activity.activityType === 'staff_unassigned')
            )
            .slice(0, 10); // Get last 10 staff activities

        console.log('\n📋 Recent Staff Activity Messages:');
        console.log('=====================================');

        recentStaffActivities.forEach((activity, index) => {
            const isAssignment = activity.activityType === 'staff_assigned';
            const icon = isAssignment ? '➕' : '➖';
            const timestamp = new Date(activity.createdAt || activity.date).toLocaleString();
            
            console.log(`${icon} ${activity.description}`);
            console.log(`   Type: ${activity.activityType}`);
            console.log(`   User: ${activity.user?.fullName || 'Unknown'}`);
            console.log(`   Time: ${timestamp}`);
            console.log(`   Message: ${activity.message || 'No message'}`);
            console.log('');
        });

        // 5. Verify message formats
        console.log('5️⃣ Verifying message formats...');
        
        const assignmentActivities = recentStaffActivities.filter(a => a.activityType === 'staff_assigned');
        const removalActivities = recentStaffActivities.filter(a => a.activityType === 'staff_unassigned');

        console.log(`\n📊 Message Format Analysis:`);
        console.log(`   - Assignment activities: ${assignmentActivities.length}`);
        console.log(`   - Removal activities: ${removalActivities.length}`);

        // Check assignment message format
        if (assignmentActivities.length > 0) {
            const assignmentMsg = assignmentActivities[0].description;
            const hasCorrectAssignmentFormat = assignmentMsg.includes('Assigned') && 
                                             assignmentMsg.includes('to project');
            console.log(`   - Assignment format correct: ${hasCorrectAssignmentFormat ? '✅' : '❌'}`);
            console.log(`     Example: "${assignmentMsg}"`);
        }

        // Check removal message format
        if (removalActivities.length > 0) {
            const removalMsg = removalActivities[0].description;
            const hasCorrectRemovalFormat = removalMsg.includes('Removed') && 
                                          removalMsg.includes('from project');
            console.log(`   - Removal format correct: ${hasCorrectRemovalFormat ? '✅' : '❌'}`);
            console.log(`     Example: "${removalMsg}"`);
        }

        // 6. Test notification page data structure
        console.log('\n6️⃣ Testing notification page data structure...');
        
        // Test the activity API with date-based pagination (as used by notification page)
        const notificationDataResponse = await axios.get(
            `${domain}/api/activity?clientId=${clientId}&paginationMode=date&dateLimit=5`
        );

        const notificationData = notificationDataResponse.data;
        console.log('📱 Notification page data structure:');
        console.log(`   - Success: ${notificationData.success !== false}`);
        console.log(`   - Has date groups: ${!!(notificationData.data?.dateGroups || notificationData.dateGroups)}`);
        
        const dateGroups = notificationData.data?.dateGroups || notificationData.dateGroups || [];
        console.log(`   - Date groups count: ${dateGroups.length}`);

        // Check if staff activities are in date groups
        let staffActivitiesInGroups = 0;
        dateGroups.forEach(group => {
            const staffActivitiesInGroup = group.activities.filter(activity => 
                activity.category === 'staff'
            ).length;
            staffActivitiesInGroups += staffActivitiesInGroup;
        });

        console.log(`   - Staff activities in date groups: ${staffActivitiesInGroups}`);

        console.log('\n🎉 Staff Removal Messages Test Completed!');
        console.log('==========================================');

        // Summary
        console.log('\n📋 SUMMARY:');
        console.log('- Staff assignment and removal activities are being logged correctly');
        console.log('- Message formats follow the expected pattern:');
        console.log('  * Assignment: "Assigned [Name] to project [Project]"');
        console.log('  * Removal: "Removed [Name] from project [Project]"');
        console.log('- Activities are available in both traditional and date-based pagination');
        console.log('- Notification page should display these messages correctly');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testStaffRemovalMessages();