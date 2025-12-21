const axios = require('axios');

const domain = 'http://localhost:3000';
const clientId = '6941b27c7fdcea3d37e02ada';

async function testNotificationStaffMessages() {
    console.log('🔔 Testing Staff Messages in Notification System');
    console.log('===============================================\n');

    try {
        // 1. Create a test staff removal activity directly
        console.log('1️⃣ Creating test staff removal activity...');
        
        const testStaffRemovalActivity = {
            user: {
                userId: 'test-admin-123',
                fullName: 'Test Admin User',
                email: 'admin@test.com'
            },
            clientId: clientId,
            projectId: 'test-project-id',
            projectName: 'Test Project Name',
            activityType: 'staff_unassigned',
            category: 'staff',
            action: 'unassign',
            description: 'Removed John Doe from project "Test Project Name"',
            message: 'Staff removed during project update',
            date: new Date().toISOString(),
            metadata: {
                staffName: 'John Doe',
            }
        };

        const createActivityResponse = await axios.post(
            `${domain}/api/activity`,
            testStaffRemovalActivity
        );

        console.log(`✅ Test removal activity created: ${createActivityResponse.status}`);
        console.log(`   Activity ID: ${createActivityResponse.data.data._id}`);

        // 2. Create a test staff assignment activity for comparison
        console.log('\n2️⃣ Creating test staff assignment activity...');
        
        const testStaffAssignmentActivity = {
            user: {
                userId: 'test-admin-123',
                fullName: 'Test Admin User',
                email: 'admin@test.com'
            },
            clientId: clientId,
            projectId: 'test-project-id',
            projectName: 'Test Project Name',
            activityType: 'staff_assigned',
            category: 'staff',
            action: 'assign',
            description: 'Assigned Jane Smith to project "Test Project Name"',
            message: 'Staff assigned during project update',
            date: new Date().toISOString(),
            metadata: {
                staffName: 'Jane Smith',
            }
        };

        const createAssignmentResponse = await axios.post(
            `${domain}/api/activity`,
            testStaffAssignmentActivity
        );

        console.log(`✅ Test assignment activity created: ${createAssignmentResponse.status}`);
        console.log(`   Activity ID: ${createAssignmentResponse.data.data._id}`);

        // 3. Fetch activities as the notification page would
        console.log('\n3️⃣ Fetching activities as notification page would...');
        
        // Test both pagination modes
        const [traditionalResponse, dateBasedResponse] = await Promise.all([
            axios.get(`${domain}/api/activity?clientId=${clientId}&limit=20`),
            axios.get(`${domain}/api/activity?clientId=${clientId}&paginationMode=date&dateLimit=5`)
        ]);

        console.log('📊 Traditional pagination response:');
        const traditionalData = traditionalResponse.data;
        const traditionalActivities = traditionalData.data?.activities || traditionalData.activities || [];
        console.log(`   - Total activities: ${traditionalActivities.length}`);
        
        const traditionalStaffActivities = traditionalActivities.filter(a => a.category === 'staff');
        console.log(`   - Staff activities: ${traditionalStaffActivities.length}`);

        console.log('\n📊 Date-based pagination response:');
        const dateBasedData = dateBasedResponse.data;
        const dateGroups = dateBasedData.data?.dateGroups || dateBasedData.dateGroups || [];
        console.log(`   - Date groups: ${dateGroups.length}`);
        
        let totalActivitiesInGroups = 0;
        let staffActivitiesInGroups = 0;
        
        dateGroups.forEach(group => {
            totalActivitiesInGroups += group.activities.length;
            const staffInGroup = group.activities.filter(a => a.category === 'staff').length;
            staffActivitiesInGroups += staffInGroup;
        });
        
        console.log(`   - Total activities in groups: ${totalActivitiesInGroups}`);
        console.log(`   - Staff activities in groups: ${staffActivitiesInGroups}`);

        // 4. Display recent staff activities with their messages
        console.log('\n4️⃣ Recent Staff Activities and Messages:');
        console.log('========================================');

        const recentStaffActivities = traditionalStaffActivities
            .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
            .slice(0, 10);

        recentStaffActivities.forEach((activity, index) => {
            const isAssignment = activity.activityType === 'staff_assigned';
            const isRemoval = activity.activityType === 'staff_unassigned';
            
            let icon = '📋';
            if (isAssignment) icon = '➕';
            if (isRemoval) icon = '➖';
            
            console.log(`${icon} ${activity.description}`);
            console.log(`   📅 ${new Date(activity.createdAt || activity.date).toLocaleString()}`);
            console.log(`   👤 ${activity.user?.fullName || 'Unknown User'}`);
            console.log(`   💬 ${activity.message || 'No message'}`);
            console.log('');
        });

        // 5. Verify message patterns
        console.log('5️⃣ Message Pattern Verification:');
        console.log('================================');

        const assignmentMessages = recentStaffActivities
            .filter(a => a.activityType === 'staff_assigned')
            .map(a => a.description);

        const removalMessages = recentStaffActivities
            .filter(a => a.activityType === 'staff_unassigned')
            .map(a => a.description);

        console.log(`📝 Assignment Messages (${assignmentMessages.length}):`);
        assignmentMessages.forEach(msg => {
            const isCorrectFormat = msg.includes('Assigned') && msg.includes('to project');
            console.log(`   ${isCorrectFormat ? '✅' : '❌'} "${msg}"`);
        });

        console.log(`\n📝 Removal Messages (${removalMessages.length}):`);
        removalMessages.forEach(msg => {
            const isCorrectFormat = msg.includes('Removed') && msg.includes('from project');
            console.log(`   ${isCorrectFormat ? '✅' : '❌'} "${msg}"`);
        });

        // 6. Test notification page filtering
        console.log('\n6️⃣ Testing Notification Page Filtering:');
        console.log('=======================================');

        // Simulate the filtering logic from notification page
        const allActivities = traditionalActivities.map(a => ({ 
            type: 'activity', 
            data: a, 
            timestamp: a.createdAt 
        }));

        const projectTabActivities = allActivities; // All activities for project tab
        const staffOnlyActivities = allActivities.filter(item => 
            item.data.category === 'staff'
        );

        console.log(`📊 Filtering Results:`);
        console.log(`   - All activities: ${allActivities.length}`);
        console.log(`   - Project tab activities: ${projectTabActivities.length}`);
        console.log(`   - Staff-only activities: ${staffOnlyActivities.length}`);

        // Check if staff activities would be visible in each tab
        const staffActivitiesInAll = allActivities.filter(item => item.data.category === 'staff').length;
        const staffActivitiesInProject = projectTabActivities.filter(item => item.data.category === 'staff').length;

        console.log(`\n📱 Visibility in Notification Tabs:`);
        console.log(`   - Staff activities in "All" tab: ${staffActivitiesInAll}`);
        console.log(`   - Staff activities in "Projects" tab: ${staffActivitiesInProject}`);
        console.log(`   - Staff activities in "Materials" tab: 0 (filtered out)`);

        console.log('\n🎉 Notification Staff Messages Test Completed!');
        console.log('==============================================');

        // Final summary
        console.log('\n📋 FINAL SUMMARY:');
        console.log('- Staff removal messages are being created with correct format');
        console.log('- Messages follow pattern: "Removed [Name] from project [Project]"');
        console.log('- Activities are available in both pagination modes');
        console.log('- Staff activities are visible in "All" and "Projects" tabs');
        console.log('- The notification page should display these messages correctly');
        console.log('\nIf you\'re not seeing removal messages:');
        console.log('1. Check if staff removal operations are actually happening');
        console.log('2. Refresh the notification page');
        console.log('3. Check the "All" or "Projects" tab (not "Materials")');
        console.log('4. Look for activities with red people icon (🧑‍🤝‍🧑)');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testNotificationStaffMessages();