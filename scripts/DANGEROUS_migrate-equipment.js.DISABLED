// Migration script to clean up Equipment collection and ensure proper schema
// Run with: node scripts/migrate-equipment.js

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name';

async function migrateEquipment() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const equipmentCollection = db.collection('equipments');
    
    // Check if collection exists and has documents
    const count = await equipmentCollection.countDocuments();
    console.log(`Found ${count} equipment documents`);
    
    if (count > 0) {
      console.log('Backing up existing equipment data...');
      
      // Create backup collection
      const backupCollection = db.collection('equipments_backup_' + Date.now());
      const existingDocs = await equipmentCollection.find({}).toArray();
      
      if (existingDocs.length > 0) {
        await backupCollection.insertMany(existingDocs);
        console.log(`Backed up ${existingDocs.length} documents to ${backupCollection.collectionName}`);
      }
      
      // Drop the existing collection to clear schema conflicts
      console.log('Dropping existing equipment collection...');
      await equipmentCollection.drop();
      console.log('Equipment collection dropped successfully');
    }
    
    // Create new collection with proper indexes
    console.log('Creating new equipment collection with proper indexes...');
    
    // Create indexes for better performance
    await equipmentCollection.createIndex({ projectId: 1 });
    await equipmentCollection.createIndex({ projectSectionId: 1 });
    await equipmentCollection.createIndex({ projectId: 1, projectSectionId: 1 });
    await equipmentCollection.createIndex({ status: 1 });
    await equipmentCollection.createIndex({ category: 1 });
    await equipmentCollection.createIndex({ createdAt: -1 });
    
    console.log('Indexes created successfully');
    console.log('Equipment migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

// Run migration
migrateEquipment();