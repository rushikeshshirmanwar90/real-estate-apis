const { MongoClient, ObjectId } = require('mongodb');

async function createTestData() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('\n========================================');
        console.log('🔧 CREATING TEST DATA');
        console.log('========================================');

        const db = client.db('real-estate');
        
        // Create test client
        const testClientId = '6941b27c7fdcea3d37e02ada';
        
        // Create test user
        const testUser = {
            _id: new ObjectId(),
            name: 'Test User',
            email: 'test@example.com',
            role: 'admin',
            company: 'Test Company'
        };
        
        await db.collection('users').insertOne(testUser);
        console.log('✅ Created test user');

        // Create test client
        const testClient = {
            _id: new ObjectId(testClientId),
            name: 'Test Client Company',
            email: 'client@example.com',
            phone: '+1234567890'
        };
        
        await db.collection('clients').insertOne(testClient);
        console.log('✅ Created test client');

        // Create test project
        const testProjectId = new ObjectId();
        const testProject = {
            _id: testProjectId,
            name: 'Test Construction Project',
            clientId: testClientId,
            MaterialAvailable: [],
            MaterialUsed: []
        };
        
        await db.collection('projects').insertOne(testProject);
        console.log('✅ Created test project');

        // Create test material activities with different cost scenarios
        const testActivities = [
            {
                _id: new ObjectId(),
                user: {
                    userId: testUser._id.toString(),
                    fullName: 'Test User'
                },
                clientId: testClientId,
                projectId: testProjectId.toString(),
                materials: [
                    {
                        name: 'Cement',
                        unit: 'bags',
                        specs: {},
                        qnt: 10,
                        cost: 5000, // Total cost for 10 bags (₹500 per bag)
                        addedAt: new Date()
                    },
                    {
                        name: 'Steel Rods',
                        unit: 'kg',
                        specs: {},
                        qnt: 50,
                        cost: 3000, // Total cost for 50 kg (₹60 per kg)
                        addedAt: new Date()
                    }
                ],
                message: 'Used 2 materials in section (₹8,000)',
                activity: 'used',
                date: new Date().toISOString()
            },
            {
                _id: new ObjectId(),
                user: {
                    userId: testUser._id.toString(),
                    fullName: 'Test User'
                },
                clientId: testClientId,
                projectId: testProjectId.toString(),
                materials: [
                    {
                        name: 'Bricks',
                        unit: 'pieces',
                        specs: {},
                        qnt: 1000,
                        cost: 15000, // Total cost for 1000 bricks (₹15 per brick)
                        addedAt: new Date()
                    }
                ],
                message: 'Imported 1 material (₹15,000)',
                activity: 'imported',
                date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
            },
            {
                _id: new ObjectId(),
                user: {
                    userId: testUser._id.toString(),
                    fullName: 'Test User'
                },
                clientId: testClientId,
                projectId: testProjectId.toString(),
                materials: [
                    {
                        name: 'Sand',
                        unit: 'cubic meters',
                        specs: {},
                        qnt: 5,
                        cost: 2500, // Total cost for 5 cubic meters (₹500 per cubic meter)
                        addedAt: new Date()
                    },
                    {
                        name: 'Gravel',
                        unit: 'cubic meters',
                        specs: {},
                        qnt: 3,
                        cost: 1800, // Total cost for 3 cubic meters (₹600 per cubic meter)
                        addedAt: new Date()
                    },
                    {
                        name: 'Paint',
                        unit: 'liters',
                        specs: {},
                        qnt: 20,
                        cost: 4000, // Total cost for 20 liters (₹200 per liter)
                        addedAt: new Date()
                    }
                ],
                message: 'Used 3 materials in mini-section (₹8,300)',
                activity: 'used',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
            }
        ];

        await db.collection('materialactivities').insertMany(testActivities);
        console.log('✅ Created test material activities');

        // Calculate expected totals
        const expectedTotal = testActivities.reduce((sum, activity) => {
            return sum + activity.materials.reduce((matSum, material) => {
                return matSum + material.cost;
            }, 0);
        }, 0);

        console.log('\n📊 TEST DATA SUMMARY:');
        console.log('========================================');
        console.log(`  - Client ID: ${testClientId}`);
        console.log(`  - Project ID: ${testProjectId}`);
        console.log(`  - Total activities: ${testActivities.length}`);
        console.log(`  - Expected total cost: ₹${expectedTotal.toLocaleString('en-IN')}`);
        console.log(`  - Activity breakdown:`);
        
        testActivities.forEach((activity, index) => {
            const activityTotal = activity.materials.reduce((sum, mat) => sum + mat.cost, 0);
            console.log(`    ${index + 1}. ${activity.activity} - ${activity.materials.length} materials - ₹${activityTotal.toLocaleString('en-IN')}`);
        });

        console.log('========================================');
        console.log('✅ Test data created successfully!');
        console.log(`🔗 Test API URL: http://localhost:8080/api/material-activity-report?clientId=${testClientId}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

// Run the creation
createTestData().catch(console.error);