// Simple script to clear Node.js require cache
// Run with: node clear-cache.js

const fs = require('fs');
const path = require('path');

console.log('Clearing Node.js require cache...');

// Clear all cached modules
Object.keys(require.cache).forEach(function(key) {
  if (key.includes('Equipment') || key.includes('models')) {
    console.log('Clearing cache for:', key);
    delete require.cache[key];
  }
});

console.log('Cache cleared. Please restart your development server.');
console.log('Run: npm run dev or yarn dev');

// Also create a simple restart instruction
const restartInstructions = `
# Equipment Model Cache Clear Instructions

## The Issue
The Equipment model was cached with the old schema that included entityType, entityId, and entityModel fields.

## Solution Steps

1. **Stop your development server** (Ctrl+C)

2. **Clear the cache** (run this script):
   \`\`\`bash
   node clear-cache.js
   \`\`\`

3. **Optional: Reset the Equipment model via API**:
   \`\`\`bash
   curl -X POST http://localhost:3000/api/equipment/reset
   \`\`\`

4. **Optional: Run the migration script**:
   \`\`\`bash
   node scripts/migrate-equipment.js
   \`\`\`

5. **Restart your development server**:
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

6. **Test the Equipment API**:
   \`\`\`bash
   curl -X GET http://localhost:3000/api/equipment/test
   \`\`\`

## What Changed
- Removed EmbeddedEquipmentSchema
- Removed entityType, entityId, entityModel fields
- Made projectSectionId and projectSectionName required
- Simplified the schema to focus on project-section tracking

## New Required Fields
- type
- category  
- quantity
- perUnitCost
- projectId
- projectName
- projectSectionId
- projectSectionName

The equipment should now work correctly with the admin dashboard!
`;

fs.writeFileSync(path.join(__dirname, 'RESTART_INSTRUCTIONS.md'), restartInstructions);
console.log('Created RESTART_INSTRUCTIONS.md with detailed steps.');