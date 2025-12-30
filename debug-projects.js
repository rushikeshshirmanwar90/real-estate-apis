const mongoose = require('mongoose');

// Database connection
const DB_URL = process.env.DB_URL || 'mongodb://localhost:27017/realEstate';

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
const Projects = mongoose.models.Projects || mongoose.model('Projects', ProjectSchema);

async function debugProjects() {
    console.log('🔍 Debugging Projects and Sections');
    console.log('==================================');

    try {
        await connectDB();

        // Find all projects
        const allProjects = await Projects.find({}).lean();
        console.log(`📋 Total projects found: ${allProjects.length}`);

        // Check projects with sections
        const projectsWithSections = allProjects.filter(p => p.section && p.section.length > 0);
        console.log(`📋 Projects with sections: ${projectsWithSections.length}`);

        if (projectsWithSections.length > 0) {
            console.log('\n📝 Section types found:');
            const sectionTypes = new Set();
            
            projectsWithSections.forEach(project => {
                console.log(`\nProject: ${project.name || project.projectName} (${project._id})`);
                console.log(`Sections: ${project.section.length}`);
                
                project.section.forEach((section, index) => {
                    console.log(`  ${index + 1}. ${section.name} - Type: "${section.type}" - ID: ${section.sectionId}`);
                    sectionTypes.add(section.type);
                });
            });

            console.log('\n🏷️ Unique section types:');
            Array.from(sectionTypes).forEach(type => {
                console.log(`  - "${type}"`);
            });

            // Check for building-like sections
            const buildingLikeSections = [];
            projectsWithSections.forEach(project => {
                project.section.forEach(section => {
                    if (section.type && section.type.toLowerCase().includes('build')) {
                        buildingLikeSections.push({
                            projectName: project.name || project.projectName,
                            projectId: project._id,
                            sectionName: section.name,
                            sectionId: section.sectionId,
                            sectionType: section.type
                        });
                    }
                });
            });

            console.log(`\n🏗️ Building-like sections found: ${buildingLikeSections.length}`);
            buildingLikeSections.forEach(section => {
                console.log(`  - ${section.sectionName} (${section.sectionType}) in ${section.projectName}`);
            });
        }

    } catch (error) {
        console.error('💥 Debug script failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

debugProjects()
    .then(() => {
        console.log('\n✅ Debug script completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Debug script failed:', error);
        process.exit(1);
    });