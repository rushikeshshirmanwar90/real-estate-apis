const mongoose = require('mongoose');

// Read .env file manually
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (error) {
  console.log('Could not read .env file, using environment variables');
}

console.log('DB_URL from env:', process.env.DB_URL);

const connectDB = async () => {
  try {
    const mongoUri = process.env.DB_URL || 'mongodb+srv://rushi:iamrushi@cluster0.kq4lbxt.mongodb.net/';
    await mongoose.connect(mongoUri, {
      dbName: "realEstate",
      bufferCommands: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const testBuildingAPI = async () => {
  await connectDB();
  
  try {
    // Import models
    const { Projects } = require('./lib/models/Project.ts');
    const { Building } = require('./lib/models/Building.ts');
    
    console.log('\n=== Testing Building 404 Fix ===');
    
    // Find a project with building sections
    const projectWithBuildings = await Projects.findOne({
      'section.type': { $in: ['building', 'Buildings'] }
    });
    
    if (!projectWithBuildings) {
      console.log('No projects with building sections found');
      return;
    }
    
    console.log(`Found project: ${projectWithBuildings.name}`);
    console.log(`Project ID: ${projectWithBuildings._id}`);
    console.log(`Sections: ${projectWithBuildings.section.length}`);
    
    // Find building sections
    const buildingSections = projectWithBuildings.section.filter(s => 
      s.type === 'building' || s.type === 'Buildings'
    );
    
    console.log(`Building sections found: ${buildingSections.length}`);
    
    for (const section of buildingSections) {
      console.log(`\n--- Testing Section: ${section.name} (${section.sectionId}) ---`);
      
      // Check if building record exists
      const existingBuilding = await Building.findById(section.sectionId);
      
      if (existingBuilding) {
        console.log('✅ Building record exists');
        console.log(`Building name: ${existingBuilding.name}`);
        console.log(`Total floors: ${existingBuilding.totalFloors}`);
      } else {
        console.log('❌ Building record missing - this would cause 404');
        
        // Test the auto-creation logic
        console.log('Testing auto-creation...');
        
        try {
          const newBuilding = new Building({
            _id: section.sectionId,
            name: section.name,
            projectId: projectWithBuildings._id,
            description: '',
            totalFloors: 0,
            totalBookedUnits: 0,
            hasBasement: false,
            hasGroundFloor: true,
            floors: [],
            images: [],
            isActive: true
          });
          
          const savedBuilding = await newBuilding.save();
          console.log('✅ Auto-creation successful');
          console.log(`Created building: ${savedBuilding.name}`);
          
          // Clean up the test building
          await Building.findByIdAndDelete(section.sectionId);
          console.log('🧹 Test building cleaned up');
          
        } catch (error) {
          console.log('❌ Auto-creation failed:', error.message);
        }
      }
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

testBuildingAPI();