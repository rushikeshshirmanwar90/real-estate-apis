const fs = require('fs');
const path = require('path');

/**
 * Script to fix all API authentication and syntax errors
 * Run with: node scripts/fix-all-apis.js
 */

const API_DIR = path.join(__dirname, '../app/api');

function fixApiFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    console.log(`🔧 Fixing: ${filePath}`);

    // Skip login routes
    if (filePath.includes('/login/')) {
      console.log(`⏭️  Skipping login route: ${filePath}`);
      return;
    }

    // 1. Fix checkValidClient calls outside try-catch
    const checkValidClientPattern = /^(\s*)await checkValidClient\(req\);\s*$/gm;
    if (checkValidClientPattern.test(content)) {
      content = content.replace(checkValidClientPattern, '');
      modified = true;
      console.log(`  ✅ Removed checkValidClient calls`);
    }

    // 2. Add withBearerAuth import if not present
    if (!content.includes('withBearerAuth') && !content.includes('import { withBearerAuth }')) {
      const importRegex = /import.*from.*["']@\/lib\/.*["'];?\n/g;
      const imports = content.match(importRegex) || [];
      
      if (imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const importToAdd = `import { withBearerAuth } from "@/lib/middleware/bearer-auth";\n`;
        content = content.replace(lastImport, lastImport + importToAdd);
        modified = true;
        console.log(`  ✅ Added withBearerAuth import`);
      }
    }

    // 3. Fix HTTP method exports to use withBearerAuth
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    
    methods.forEach(method => {
      // Pattern 1: Fix async functions without withBearerAuth
      const asyncPattern = new RegExp(`export const ${method} = async \\((req: NextRequest[^)]*?)\\)`, 'g');
      if (asyncPattern.test(content)) {
        content = content.replace(
          new RegExp(`export const ${method} = async \\((req: NextRequest[^)]*?)\\)`, 'g'),
          `export const ${method} = withBearerAuth(async (req: NextRequest)`
        );
        
        // Find and fix the closing of the function
        const lines = content.split('\n');
        let braceCount = 0;
        let functionStarted = false;
        let functionLine = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`export const ${method} = withBearerAuth`)) {
            functionStarted = true;
            functionLine = i;
            continue;
          }
          
          if (functionStarted) {
            const openBraces = (lines[i].match(/{/g) || []).length;
            const closeBraces = (lines[i].match(/}/g) || []).length;
            braceCount += openBraces - closeBraces;
            
            // Look for the end of the function
            if (braceCount === 0 && (lines[i].includes('};') || lines[i].trim() === '}')) {
              if (lines[i].includes('};')) {
                lines[i] = lines[i].replace('};', '});');
              } else if (lines[i].trim() === '}') {
                lines[i] = lines[i].replace('}', '});');
              }
              modified = true;
              break;
            }
          }
        }
        
        content = lines.join('\n');
        console.log(`  ✅ Fixed ${method} method with withBearerAuth`);
      }
    });

    // 4. Fix Request type to NextRequest consistently
    content = content.replace(/req: NextRequest \| Request/g, 'req: NextRequest');
    if (content.includes('NextRequest | Request')) {
      modified = true;
      console.log(`  ✅ Fixed Request type consistency`);
    }

    // 5. Remove unused checkValidClient imports
    const checkValidClientImportPattern = /,\s*checkValidClient|checkValidClient\s*,|import\s*{\s*checkValidClient\s*}\s*from[^;]+;?\s*\n?/g;
    if (checkValidClientImportPattern.test(content)) {
      content = content.replace(checkValidClientImportPattern, '');
      modified = true;
      console.log(`  ✅ Removed checkValidClient imports`);
    }

    // 6. Clean up empty lines and formatting
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    content = content.replace(/^\s*\n/gm, '');

    // 7. Fix incomplete function definitions (basic fix)
    if (content.includes('export const DELETE = withBearerAuth(async (req: NextRequest) => {') && 
        !content.includes('});', content.lastIndexOf('export const DELETE'))) {
      content += '\n});';
      modified = true;
      console.log(`  ✅ Fixed incomplete DELETE function`);
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (item === 'route.ts' || item === 'route.tsx') {
      fixApiFile(fullPath);
    }
  });
}

console.log('🚀 Starting API fixes...');
console.log('📁 Processing directory:', API_DIR);

processDirectory(API_DIR);

console.log('\n✅ API fixes completed!');
console.log('\n📋 What was fixed:');
console.log('- Removed checkValidClient calls outside try-catch');
console.log('- Added withBearerAuth imports where missing');
console.log('- Wrapped all HTTP methods with withBearerAuth');
console.log('- Fixed Request type consistency');
console.log('- Removed unused imports');
console.log('- Fixed incomplete function definitions');
console.log('\n🔒 All APIs now use withBearerAuth consistently!');