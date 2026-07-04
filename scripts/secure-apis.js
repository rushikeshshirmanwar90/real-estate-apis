const fs = require('fs');
const path = require('path');

/**
 * Script to automatically add Bearer token authentication to all API routes
 * Run with: node scripts/secure-apis.js
 */

const API_DIR = path.join(__dirname, '../app/api');

function addBearerAuthToRoute(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has withBearerAuth
    if (content.includes('withBearerAuth')) {
      console.log(`✅ Already secured: ${filePath}`);
      return;
    }

    // Skip login route (it should remain public)
    if (filePath.includes('/login/')) {
      console.log(`⏭️  Skipping login route: ${filePath}`);
      return;
    }

    // Add import if not present
    if (!content.includes('withBearerAuth')) {
      const importRegex = /import.*from.*["']@\/lib\/.*["'];?\n/g;
      const imports = content.match(importRegex) || [];
      
      if (imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const importToAdd = `import { withBearerAuth } from "@/lib/middleware/bearer-auth";\n`;
        content = content.replace(lastImport, lastImport + importToAdd);
      }
    }

    // Wrap exported functions with withBearerAuth
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    
    methods.forEach(method => {
      const regex = new RegExp(`export const ${method} = async \\(req: NextRequest\\)`, 'g');
      if (regex.test(content)) {
        content = content.replace(
          new RegExp(`export const ${method} = async \\(req: NextRequest\\)`, 'g'),
          `export const ${method} = withBearerAuth(async (req: NextRequest)`
        );
        
        // Find the closing of the function and add closing parenthesis
        // This is a simple approach - for complex functions, manual review might be needed
        const lines = content.split('\n');
        let braceCount = 0;
        let functionStarted = false;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`export const ${method} = withBearerAuth`)) {
            functionStarted = true;
            continue;
          }
          
          if (functionStarted) {
            const openBraces = (lines[i].match(/{/g) || []).length;
            const closeBraces = (lines[i].match(/}/g) || []).length;
            braceCount += openBraces - closeBraces;
            
            if (braceCount === 0 && lines[i].includes('};')) {
              lines[i] = lines[i].replace('};', '});');
              break;
            }
          }
        }
        
        content = lines.join('\n');
      }
    });

    fs.writeFileSync(filePath, content);
    console.log(`🔒 Secured: ${filePath}`);
    
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
      addBearerAuthToRoute(fullPath);
    }
  });
}

console.log('🚀 Starting API security process...');
console.log('📁 Processing directory:', API_DIR);

processDirectory(API_DIR);

console.log('\n✅ API security process completed!');
console.log('\n📋 Next steps:');
console.log('1. Set API_BEARER_TOKEN in your .env file');
console.log('2. Review the modified files');
console.log('3. Test your APIs with Bearer token');
console.log('\n💡 Example usage:');
console.log('curl -H "Authorization: Bearer your-token-here" http://localhost:8080/api/project');