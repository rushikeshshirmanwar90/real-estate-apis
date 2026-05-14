const fs = require('fs');
const path = require('path');

/**
 * Script to remove all license check functions and replace with withBearerAuth
 * Run with: node scripts/remove-license-checks.js
 */

const API_DIR = path.join(__dirname, '../app/api');

function removeLicenseChecksFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Skip if no license checks found
    if (!content.includes('licenseCheck') && !content.includes('LicenseCheck')) {
      return;
    }

    console.log(`🔄 Processing: ${filePath}`);

    // Remove license check imports
    const licenseImportPatterns = [
      /import\s*{\s*[^}]*withLicenseCheck[^}]*}\s*from\s*["'][^"']*licenseCheck["'];\s*\n?/g,
      /import\s*{\s*[^}]*checkLicense[^}]*}\s*from\s*["'][^"']*licenseCheck["'];\s*\n?/g,
      /import\s*{\s*[^}]*LicenseCheck[^}]*}\s*from\s*["'][^"']*[Ll]icense[^"']*["'];\s*\n?/g,
      /,\s*withLicenseCheck/g,
      /,\s*checkLicense/g,
      /withLicenseCheck\s*,/g,
      /checkLicense\s*,/g
    ];

    licenseImportPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
      }
    });

    // Remove license filter imports
    const licenseFilterPatterns = [
      /import\s*{\s*[^}]*addLicenseStatusToProjects[^}]*}\s*from\s*["'][^"']*projectLicenseFilter["'];\s*\n?/g,
      /import\s*{\s*[^}]*canAccessProject[^}]*}\s*from\s*["'][^"']*projectLicenseFilter["'];\s*\n?/g,
      /,\s*addLicenseStatusToProjects/g,
      /,\s*canAccessProject/g,
      /addLicenseStatusToProjects\s*,/g,
      /canAccessProject\s*,/g
    ];

    licenseFilterPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
      }
    });

    // Add withBearerAuth import if not present and license checks were removed
    if (modified && !content.includes('withBearerAuth')) {
      const importRegex = /import.*from.*["']@\/lib\/.*["'];?\n/g;
      const imports = content.match(importRegex) || [];
      
      if (imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const importToAdd = `import { withBearerAuth } from "@/lib/middleware/bearer-auth";\n`;
        content = content.replace(lastImport, lastImport + importToAdd);
      }
    }

    // Replace withLicenseCheck with withBearerAuth
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    
    methods.forEach(method => {
      const withLicensePattern = new RegExp(`export const ${method} = withLicenseCheck\\(async \\(req: NextRequest\\)`, 'g');
      if (withLicensePattern.test(content)) {
        content = content.replace(
          withLicensePattern,
          `export const ${method} = withBearerAuth(async (req: NextRequest)`
        );
        modified = true;
      }
    });

    // Remove license check function calls
    const licenseCallPatterns = [
      /const\s+licenseInfo\s*=\s*await\s+checkLicense\([^)]*\);\s*\n?/g,
      /if\s*\(\s*!licenseInfo\.hasAccess\s*\)\s*{[^}]*}\s*\n?/g,
      /\/\/\s*Manual license check\s*\n?/g,
      /\/\/.*license.*check.*\n/gi,
      /console\.log\([^)]*license[^)]*\);\s*\n?/gi
    ];

    licenseCallPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
      }
    });

    // Remove license status related code
    const licenseStatusPatterns = [
      /\/\/\s*Add license status to projects.*\n/g,
      /console\.log\([^)]*license status[^)]*\);\s*\n?/gi,
      /projects\s*=\s*await\s+addLicenseStatusToProjects\([^)]*\);\s*\n?/g,
      /\/\/\s*For staff users, check if they can access.*\n/g,
      /if\s*\(\s*userRole\s*!==\s*['"]admin['"]\s*\)\s*{[^}]*canAccessProject[^}]*}\s*\n?/gs,
      /const\s+accessCheck\s*=\s*await\s+canAccessProject\([^)]*\);\s*\n?/g,
      /if\s*\(\s*!accessCheck\.canAccess\s*\)\s*{[^}]*}\s*\n?/g
    ];

    licenseStatusPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
      }
    });

    // Clean up empty lines and extra spaces
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    content = content.replace(/^\s*\n/gm, '');

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath}`);
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
      removeLicenseChecksFromFile(fullPath);
    }
  });
}

console.log('🚀 Starting license check removal process...');
console.log('📁 Processing directory:', API_DIR);

processDirectory(API_DIR);

console.log('\n✅ License check removal completed!');
console.log('\n📋 What was removed:');
console.log('- withLicenseCheck imports and usage');
console.log('- checkLicense function calls');
console.log('- addLicenseStatusToProjects calls');
console.log('- canAccessProject checks');
console.log('- License-related console.log statements');
console.log('\n🔒 All APIs now use withBearerAuth only!');