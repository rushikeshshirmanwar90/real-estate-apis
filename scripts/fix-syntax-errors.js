const fs = require('fs');
const path = require('path');

// List of files with syntax errors and their fixes
const fixes = [
  {
    file: 'app/api/building/floors/route.ts',
    search: /if \(!body\.buildingId\) \{\s*return errorResponse\("Building ID is required", 400\);\s*\}\);/g,
    replace: 'if (!body.buildingId) {\n      return errorResponse("Building ID is required", 400);\n    }'
  },
  {
    file: 'app/api/building/route.ts',
    search: /if \(!body\.projectId\) \{\s*return errorResponse\("Project ID is required", 400\);\s*\}\);/g,
    replace: 'if (!body.projectId) {\n      return errorResponse("Project ID is required", 400);\n    }'
  },
  {
    file: 'app/api/building/units/route.ts',
    search: /if \(!body\.buildingId\) \{\s*return errorResponse\("Building ID is required", 400\);\s*\}\);/g,
    replace: 'if (!body.buildingId) {\n      return errorResponse("Building ID is required", 400);\n    }'
  },
  {
    file: 'app/api/clients/route.ts',
    search: /if \(!data\.email\) \{\s*return errorResponse\("Email is required", 400\);\s*\}\);/g,
    replace: 'if (!data.email) {\n      return errorResponse("Email is required", 400);\n    }'
  },
  {
    file: 'app/api/contacts/route.ts',
    search: /400\s*\);\s*\}\);/g,
    replace: '400\n      );\n    }'
  },
  {
    file: 'app/api/cron/license-update/route.ts',
    search: /if \(process\.env\.NODE_ENV === 'production'\) \{\s*return errorResponse\("Use POST method for cron job execution", 405\);\s*\}\);/g,
    replace: 'if (process.env.NODE_ENV === \'production\') {\n      return errorResponse("Use POST method for cron job execution", 405);\n    }'
  },
  {
    file: 'app/api/equipment/reset/route.ts',
    search: /logger\.info\("Equipment model cleared from cache"\);\s*\}\);/g,
    replace: 'logger.info("Equipment model cleared from cache");\n    }'
  },
  {
    file: 'app/api/floors/route.ts',
    search: /if \(!body\.buildingId\) \{\s*return errorResponse\("Building ID is required", 400\);\s*\}\);/g,
    replace: 'if (!body.buildingId) {\n        return errorResponse("Building ID is required", 400);\n      }'
  },
  {
    file: 'app/api/leads/route.ts',
    search: /if \(!body\.clientId\) \{\s*return errorResponse\("Client ID is required", 400\);\s*\}\);/g,
    replace: 'if (!body.clientId) {\n      return errorResponse("Client ID is required", 400);\n    }'
  },
  {
    file: 'app/api/push-token/route.ts',
    search: /return errorResponse\(rateLimitResult\.error!, 429\);\s*\}\);/g,
    replace: 'return errorResponse(rateLimitResult.error!, 429);\n    }'
  },
  {
    file: 'app/api/send-mail/route.tsx',
    search: /\{ status: 500 \}\s*\);\s*\}\);/g,
    replace: '{ status: 500 }\n        );\n    }'
  },
  {
    file: 'app/api/units/route.ts',
    search: /if \(!body\.buildingId \|\| !body\.floorId\) \{\s*return errorResponse\("Building ID and Floor ID are required", 400\);\s*\}\);/g,
    replace: 'if (!body.buildingId || !body.floorId) {\n      return errorResponse("Building ID and Floor ID are required", 400);\n    }'
  },
  {
    file: 'app/api/users/admin/route.ts',
    search: /if \(!data\.email\) \{\s*return errorResponse\("Email is required", 400\);\s*\}\);/g,
    replace: 'if (!data.email) {\n      return errorResponse("Email is required", 400);\n    }'
  },
  {
    file: 'app/api/users/staff/assign-client/route.ts',
    search: /if \(!data\.staffId\) \{\s*return errorResponse\("Staff ID is required", 400\);\s*\}\);/g,
    replace: 'if (!data.staffId) {\n      return errorResponse("Staff ID is required", 400);\n    }'
  }
];

// Apply fixes
fixes.forEach(fix => {
  const filePath = path.join(__dirname, '..', fix.file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = content.replace(fix.search, fix.replace);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed syntax errors in ${fix.file}`);
    } else {
      console.log(`⚠️ No changes made to ${fix.file} - pattern not found`);
    }
  } else {
    console.log(`❌ File not found: ${fix.file}`);
  }
});

console.log('✅ Syntax error fixes completed');