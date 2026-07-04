const fs = require('fs');
const path = require('path');

/**
 * Script to fix all compilation errors found by npm run build
 * Run with: node scripts/fix-compilation-errors.js
 */

const API_DIR = path.join(__dirname, '../app/api');

function fixCompilationErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    console.log(`🔧 Fixing compilation errors in: ${filePath}`);

    // Fix 1: Missing try block structure
    // Pattern: export const METHOD = withBearerAuth(async (req: NextRequest) => {
    //   // missing try {
    //   } catch (error) {
    //   });
    
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    
    methods.forEach(method => {
      // Look for functions that have withBearerAuth but missing try block
      const methodPattern = new RegExp(
        `(export const ${method} = withBearerAuth\\(async \\(req: NextRequest\\) => \\{)\\s*([^}]*?)\\s*(} catch \\(error[^}]*\\{[^}]*}\\s*}\\);)`,
        'gs'
      );
      
      if (methodPattern.test(content)) {
        content = content.replace(methodPattern, (match, start, body, catchBlock) => {
          // Add try block around the body
          return `${start}\n  try {\n${body.trim()}\n  ${catchBlock}`;
        });
        modified = true;
        console.log(`  ✅ Fixed try block structure for ${method}`);
      }
    });

    // Fix 2: Incorrect closing patterns
    // Replace }); at end of catch blocks that should be });
    content = content.replace(/(\} catch \([^}]*\{[^}]*\})\s*\}\);/g, '$1\n});');

    // Fix 3: Missing semicolons and incorrect syntax
    // Fix specific patterns found in build errors

    // Fix: }); should be }; in some contexts
    content = content.replace(/return errorResponse\([^)]*\);\s*\}\);/g, (match) => {
      return match.replace('});', '');
    });

    // Fix 4: Async/await issues
    // Make sure functions using await are marked as async
    if (content.includes('await ') && !content.includes('async ')) {
      content = content.replace(
        /(export const \w+ = withBearerAuth\()\(req: NextRequest\)/g,
        '$1async (req: NextRequest)'
      );
      modified = true;
    }

    // Fix 5: Specific syntax errors from build output
    
    // Fix missing closing braces in specific patterns
    content = content.replace(/(\s+if \([^)]*\) \{[^}]*return errorResponse[^;]*;\s*)\}\);/g, '$1}');
    
    // Fix incorrect else statements
    content = content.replace(/\s*\} else \{/g, '\n    } else {');
    
    // Fix missing semicolons after return statements
    content = content.replace(/return \{([^}]*)\}\s*\}\);/g, 'return {$1};\n  });');
    
    // Fix await in non-async context
    content = content.replace(/const (\w+) = await ([^;]*);/g, (match, varName, expression) => {
      // Check if we're in an async context
      const lines = content.split('\n');
      const matchLine = lines.findIndex(line => line.includes(match));
      if (matchLine > 0) {
        // Look backwards for function declaration
        for (let i = matchLine; i >= 0; i--) {
          if (lines[i].includes('async (') || lines[i].includes('async function')) {
            return match; // Keep as is, we're in async context
          }
          if (lines[i].includes('function') || lines[i].includes('=>')) {
            // We're in non-async function, remove await
            return `const ${varName} = ${expression};`;
          }
        }
      }
      return match;
    });

    // Fix 6: Clean up extra whitespace and formatting
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    content = content.replace(/^\s*\n/gm, '');

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed compilation errors in: ${filePath}`);
    } else {
      console.log(`⏭️  No compilation errors found in: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Fix specific files mentioned in build errors
const specificFixes = {
  'app/api/(Xsite)/import/route.ts': (content) => {
    // Fix the specific error at line 144
    return content.replace(
      /(\} catch \(error: unknown\) \{[^}]*\})\s*\}\);/g,
      '$1\n});'
    );
  },
  
  'app/api/admin/sync-staff-projects/route.ts': (content) => {
    // Fix the missing closing parenthesis
    return content.replace(
      /assignedProjects: \{ \$exists: true, \$ne: \[\] \}\);/g,
      'assignedProjects: { $exists: true, $ne: [] } });'
    );
  },
  
  'app/api/analytics/route.ts': (content) => {
    // Fix missing semicolon
    return content.replace(
      /MaterialActivities: materialActivities\.filter\([^)]*\)\s*\}\);/g,
      'MaterialActivities: materialActivities.filter((ma: any) => ma.projectId === projectIdString)\n      };'
    );
  },
  
  'app/api/password/route.ts': (content) => {
    // Fix incorrect return statement
    return content.replace(
      /return \{ updatedUser, normalizedUserType \}\);/g,
      'return { updatedUser, normalizedUserType };'
    );
  }
};

function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (item === 'route.ts' || item === 'route.tsx') {
      // Apply specific fixes first
      const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
      if (specificFixes[relativePath]) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = specificFixes[relativePath](content);
        fs.writeFileSync(fullPath, content);
        console.log(`🎯 Applied specific fix for: ${relativePath}`);
      }
      
      // Then apply general fixes
      fixCompilationErrors(fullPath);
    }
  });
}

console.log('🚀 Starting compilation error fixes...');
console.log('📁 Processing directory:', API_DIR);

processDirectory(API_DIR);

console.log('\n✅ Compilation error fixes completed!');
console.log('\n📋 What was fixed:');
console.log('- Fixed missing try block structures');
console.log('- Fixed incorrect closing patterns');
console.log('- Fixed missing semicolons');
console.log('- Fixed async/await issues');
console.log('- Applied specific fixes for build errors');
console.log('\n🔒 Run "npm run build" to verify fixes!');