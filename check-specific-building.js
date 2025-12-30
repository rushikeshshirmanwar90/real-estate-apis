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

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            dbName: "realEstate",
            bufferCommands: true,
        });
        console.log('✅ Connected to database');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};

// Define schemas (simplified versions)
const ProjectSchema = new mongoose.Schema({}, { strict: false });
const BuildingSchema = new mongoose.Schema({}, { strict: false });

const Projects = mongoose.models.Projects || mongoose.model('Projects', ProjectSchema);
const Building = mongoose.models.Building || mongoose.model('Building', BuildingSchema);

async function checkSpecificBuilding() {
    console.log('🔍 Checking Specific Building');
    console.log('============================');

    try {
        await connectDB();

        const buildingId = '69462b94a87a0ef600e5e7df'; // The ID from the error
        console.log(`🏗️ Checking building ID: ${buildingId}`);

        // Check if building exists
        const building = await Building.findById(buildingId);
        
        if (building) {
            console.log('✅ Building found in Building collection:');
            console.log(`   Name: ${building.name}`);
            console.log(`   Project ID: ${building.projectId}`);
            console.log(`   Total Floors: ${building.totalFloors}`);
            console.log(`   Has Basement: ${building.hasBasement}`);
            console.log(`   Has Ground Floor: ${building.hasGroundFloor}`);
        } else {
            console.log('❌ Building NOT found in Building collection');
        }

        // Check if it exists as a section in projects
        const projectWithSection = await Projects.findOne({
            'section.sectionId': buildingId
        });

        if (projectWithSection) {
            console.log('✅ Building found as section in project:');
            console.log(`   Project: ${projectWithSection.name || projectWithSection.projectName}`);
            console.log(`   Project ID: ${projectWithSection._id}`);
            
            const section = projectWithSection.section.find(s => s.sectionId === buildingId);
            if (section) {
                console.log(`   Section Name: ${section.name}`);
                console.log(`   Section Type: ${section.type}`);
            }

            // If building doesn't exist but section does, create it
            if (!building) {
                console.log('\n🔧 Creating missing building record...');
                
                const newBuilding = new Building({
                    _id: buildingId,
                    name: section.name,
                    projectId: projectWithSection._id,
                    description: '',
                    totalFloors: 0,
                    totalBookedUnits: 0,
                    hasBasement: false,
                    hasGroundFloor: true,
                    floors: [],
                    images: [],
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                await newBuilding.save();
                console.log('✅ Building created successfully!');
            }
        } else {
            console.log('❌ Building NOT found as section in any project');
        }

    } catch (error) {
        console.error('💥 Check failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

checkSpecificBuilding()
    .then(() => {
        console.log('\n✅ Check completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Check failed:', error);
        process.exit(1);
    });