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

// Database connection
const DB_URL = process.env.DB_URL || 'mongodb://localhost:27017/realEstate';

// Import models (you may need to adjust paths)
const connectDB = async () => {
    try {
        await mongoose.connect(DB_URL, {
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

async function fixMissingBuildings() {
    console.log('🔧 Starting Missing Buildings Repair');
    console.log('====================================');

    try {
        await connectDB();

        // Find all projects with building sections
        const projects = await Projects.find({
            'section.type': 'Buildings'
        }).lean();

        console.log(`📋 Found ${projects.length} projects with building sections`);

        let fixedCount = 0;
        let alreadyExistCount = 0;
        let errorCount = 0;

        for (const project of projects) {
            console.log(`\n🏗️ Processing project: ${project.name || project.projectName} (${project._id})`);
            
            const buildingSections = project.section.filter(s => s.type === 'Buildings');
            console.log(`   Found ${buildingSections.length} building sections`);

            for (const section of buildingSections) {
                const buildingId = section.sectionId;
                console.log(`   Checking building: ${section.name} (${buildingId})`);

                try {
                    // Check if building exists
                    const existingBuilding = await Building.findById(buildingId);

                    if (existingBuilding) {
                        console.log(`   ✅ Building already exists`);
                        alreadyExistCount++;
                    } else {
                        console.log(`   🔧 Creating missing building...`);

                        // Create the missing building
                        const newBuilding = new Building({
                            _id: buildingId,
                            name: section.name,
                            projectId: project._id,
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
                        console.log(`   ✅ Building created successfully`);
                        fixedCount++;
                    }
                } catch (error) {
                    console.error(`   ❌ Error processing building ${buildingId}:`, error.message);
                    errorCount++;
                }
            }
        }

        console.log('\n📊 Repair Summary');
        console.log('=================');
        console.log(`✅ Buildings created: ${fixedCount}`);
        console.log(`ℹ️ Buildings already existed: ${alreadyExistCount}`);
        console.log(`❌ Errors encountered: ${errorCount}`);

        if (fixedCount > 0) {
            console.log('\n🎉 Missing buildings have been created!');
            console.log('You can now access building details without errors.');
        } else if (alreadyExistCount > 0 && errorCount === 0) {
            console.log('\n✅ All buildings already exist. No repairs needed.');
        }

    } catch (error) {
        console.error('💥 Repair script failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

// Run the repair script
if (require.main === module) {
    fixMissingBuildings()
        .then(() => {
            console.log('\n✅ Repair script completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Repair script failed:', error);
            process.exit(1);
        });
}

module.exports = fixMissingBuildings;