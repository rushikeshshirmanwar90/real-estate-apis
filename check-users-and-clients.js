const { MongoClient } = require('mongodb');

async function checkUsersAndClients() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('\n========================================');
        console.log('🔍 CHECKING USERS AND CLIENTS');
        console.log('========================================');

        const db = client.db('real-estate');
        
        // Check all collections
        const collections = await db.listCollections().toArray();
        console.log('📋 Available collections:');
        collections.forEach((collection, index) => {
            console.log(`  ${index + 1}. ${collection.name}`);
        });

        // Check users collection
        const usersCollection = db.collection('users');
        const users = await usersCollection.find({}).limit(10).toArray();
        
        console.log(`\n📋 Users collection: ${users.length} records found`);
        
        if (users.length > 0) {
            console.log('\n📊 Sample User records:');
            users.forEach((user, index) => {
                console.log(`  ${index + 1}. ID: ${user._id}`);
                console.log(`     Name: ${user.name || user.fullName || 'Unknown'}`);
                console.log(`     Email: ${user.email || 'No email'}`);
                console.log(`     Role: ${user.role || 'No role'}`);
                console.log(`     Company: ${user.company || 'No company'}`);
                console.log('');
            });
        }

        // Check clients collection
        const clientsCollection = db.collection('clients');
        const clients = await clientsCollection.find({}).limit(10).toArray();
        
        console.log(`📋 Clients collection: ${clients.length} records found`);
        
        if (clients.length > 0) {
            console.log('\n📊 Sample Client records:');
            clients.forEach((client, index) => {
                console.log(`  ${index + 1}. ID: ${client._id}`);
                console.log(`     Name: ${client.name || client.companyName || 'Unknown'}`);
                console.log(`     Email: ${client.email || 'No email'}`);
                console.log(`     Phone: ${client.phone || 'No phone'}`);
                console.log('');
            });
        }

        // Check projects collection
        const projectsCollection = db.collection('projects');
        const projects = await projectsCollection.find({}).limit(5).toArray();
        
        console.log(`📋 Projects collection: ${projects.length} records found`);
        
        if (projects.length > 0) {
            console.log('\n📊 Sample Project records:');
            projects.forEach((project, index) => {
                console.log(`  ${index + 1}. ID: ${project._id}`);
                console.log(`     Name: ${project.name || project.title || 'Unknown'}`);
                console.log(`     Client ID: ${project.clientId || 'No client ID'}`);
                console.log(`     Materials Available: ${project.MaterialAvailable?.length || 0}`);
                console.log(`     Materials Used: ${project.MaterialUsed?.length || 0}`);
                console.log('');
            });
        }

        console.log('========================================');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

// Run the check
checkUsersAndClients().catch(console.error);