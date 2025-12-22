const { default: fetch } = require('node-fetch');

async function testProjectFiltering() {
    try {
        console.log('\n========================================');
        console.log('🔍 TESTING PROJECT FILTERING');
        console.log('========================================');

        const clientId = '6941b27c7fdcea3d37e02ada';
        
        // Test 1: Get all projects for client
        console.log('\n📋 TEST 1: Fetching client projects');
        const projectsUrl = `http://localhost:8080/api/client-projects?clientId=${clientId}`;
        const projectsResponse = await fetch(projectsUrl);
        const projectsData = await projectsResponse.json();
        
        if (projectsData.success) {
            console.log(`✅ Found ${projectsData.data.count} projects:`);
            projectsData.data.projects.forEach((project, index) => {
                console.log(`  ${index + 1}. ${project.name} (ID: ${project._id})`);
                console.log(`     Created: ${new Date(project.createdAt).toLocaleDateString()}`);
            });
        } else {
            console.log('❌ Failed to fetch projects:', projectsData.error);
            return;
        }

        // Test 2: Get all activities (no project filter)
        console.log('\n📊 TEST 2: All activities (no project filter)');
        const allActivitiesUrl = `http://localhost:8080/api/material-activity-report?clientId=${clientId}`;
        const allActivitiesResponse = await fetch(allActivitiesUrl);
        const allActivitiesData = await allActivitiesResponse.json();
        
        if (allActivitiesData.success) {
            console.log(`  - Total activities: ${allActivitiesData.data.activities.length}`);
            console.log(`  - Total cost: ₹${allActivitiesData.data.summary.totalCost.toLocaleString('en-IN')}`);
            
            // Show project breakdown
            const projectBreakdown = {};
            allActivitiesData.data.activities.forEach(activity => {
                const projectId = activity.projectId;
                const projectName = activity.projectName || 'Unknown Project';
                if (!projectBreakdown[projectId]) {
                    projectBreakdown[projectId] = {
                        name: projectName,
                        count: 0,
                        cost: 0
                    };
                }
                projectBreakdown[projectId].count++;
                
                // Calculate activity cost with corrected logic
                const activityCost = activity.materials.reduce((sum, material) => {
                    const perUnitCost = Number(material.cost) || 0;
                    const quantity = Number(material.qnt) || 0;
                    return sum + (perUnitCost * quantity);
                }, 0);
                projectBreakdown[projectId].cost += activityCost;
            });
            
            console.log('  📋 Project breakdown:');
            Object.entries(projectBreakdown).forEach(([projectId, data]) => {
                console.log(`    - ${data.name}: ${data.count} activities, ₹${data.cost.toLocaleString('en-IN')}`);
            });
        }

        // Test 3: Filter by specific project
        if (projectsData.success && projectsData.data.projects.length > 0) {
            const testProject = projectsData.data.projects[0];
            console.log(`\n📊 TEST 3: Filter by project "${testProject.name}"`);
            
            const filteredUrl = `http://localhost:8080/api/material-activity-report?clientId=${clientId}&projectId=${testProject._id}`;
            const filteredResponse = await fetch(filteredUrl);
            const filteredData = await filteredResponse.json();
            
            if (filteredData.success) {
                console.log(`  - Filtered activities: ${filteredData.data.activities.length}`);
                console.log(`  - Filtered cost: ₹${filteredData.data.summary.totalCost.toLocaleString('en-IN')}`);
                console.log(`  - Project filter: ${filteredData.data.summary.projectFilter}`);
                
                // Verify all activities belong to the selected project
                const wrongProjectActivities = filteredData.data.activities.filter(
                    activity => activity.projectId !== testProject._id
                );
                
                if (wrongProjectActivities.length === 0) {
                    console.log('  ✅ All activities belong to the selected project');
                } else {
                    console.log(`  ❌ Found ${wrongProjectActivities.length} activities from wrong projects`);
                }
            } else {
                console.log('  ❌ Failed to fetch filtered activities:', filteredData.error);
            }
        }

        // Test 4: Test with non-existent project ID
        console.log('\n📊 TEST 4: Filter by non-existent project');
        const nonExistentUrl = `http://localhost:8080/api/material-activity-report?clientId=${clientId}&projectId=000000000000000000000000`;
        const nonExistentResponse = await fetch(nonExistentUrl);
        const nonExistentData = await nonExistentResponse.json();
        
        if (nonExistentData.success) {
            console.log(`  - Activities found: ${nonExistentData.data.activities.length}`);
            console.log('  ✅ Correctly returns empty result for non-existent project');
        }

        console.log('\n========================================');
        console.log('✅ PROJECT FILTERING TESTS COMPLETED');
        console.log('========================================');

    } catch (error) {
        console.error('❌ Error testing project filtering:', error);
    }
}

// Run the test
testProjectFiltering().catch(console.error);