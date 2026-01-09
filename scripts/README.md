# Staff Assignment Scripts

This directory contains utility scripts for managing staff project assignments.

## Scripts Overview

### 1. `syncStaffProjects.ts`
**Purpose**: Migrates existing project assignments from the Projects collection to the Staff collection.

**When to use**: 
- After updating the Staff model to include the new `assignedProjects` field
- To fix data inconsistencies between Projects and Staff collections
- One-time migration after deploying the updated code

**How to run**:
```bash
# Using npm script (recommended)
npm run sync-staff

# Or directly with ts-node
npx ts-node scripts/syncStaffProjects.ts
```

### 2. `testStaffAssignment.ts`
**Purpose**: Tests the staff assignment functionality to ensure everything works correctly.

**What it does**:
- Finds sample staff and project data
- Tests the `assignStaffToProject` utility function
- Verifies data consistency in both collections
- Shows detailed assignment information

**How to run**:
```bash
# Using npm script (recommended)
npm run test-staff

# Or directly with ts-node
npx ts-node scripts/testStaffAssignment.ts
```

### 3. `checkEnv.ts`
**Purpose**: Validates that all required environment variables are set.

**Required environment variables**:
- `DB_URL`: MongoDB connection string
- `NEXT_PUBLIC_DOMAIN`: Your application domain

## Prerequisites

1. **Environment Setup**: Ensure your `.env` file contains all required variables
2. **Database Connection**: Make sure your MongoDB instance is running and accessible
3. **Test Data**: For testing, ensure you have at least one staff member and one project in your database

## Usage Workflow

### Initial Setup (One-time)
1. Deploy the updated Staff model and utility functions
2. Run the sync script to migrate existing data:
   ```bash
   npm run sync-staff
   ```
3. Test the functionality:
   ```bash
   npm run test-staff
   ```

### Regular Testing
Run the test script whenever you want to verify the assignment system:
```bash
npm run test-staff
```

## API Endpoints

You can also use the API endpoints for management:

### Sync Data
```bash
POST /api/admin/sync-staff-projects
```

### Check Sync Status
```bash
GET /api/admin/sync-staff-projects
```

## Troubleshooting

### Common Issues

1. **"No sample staff or project found"**
   - Create test data through your application UI
   - Or use your existing API endpoints to create staff and projects

2. **Database connection errors**
   - Check your `DB_URL` environment variable
   - Ensure MongoDB is running
   - Verify network connectivity

3. **"Staff is already assigned to this project"**
   - This is expected behavior if you run the test multiple times
   - The system prevents duplicate assignments

4. **TypeScript compilation errors**
   - Ensure all dependencies are installed: `npm install`
   - Check that TypeScript is properly configured

### Environment Variables

Create a `.env` file in the project root with:
```env
DB_URL=mongodb://localhost:27017/your-database
NEXT_PUBLIC_DOMAIN=http://localhost:3000
```

## Script Output Examples

### Successful Sync
```
✅ All required environment variables are set
🔄 Starting staff project assignments sync...
✅ Connected to database
✅ Sync completed successfully!
Staff project assignments synced successfully
```

### Successful Test
```
✅ All required environment variables are set
✅ Connected to database
📋 Sample Staff: { id: '...', name: 'John Doe', currentProjects: 1 }
📋 Sample Project: { id: '...', name: 'Project Alpha', client: 'Client ABC', currentStaff: 2 }
✅ Staff assignment test successful!
📊 Updated Staff assignedProjects: 1
📊 Updated Project assignedStaff: 2
📝 Staff's assigned projects:
  1. Project Alpha (Client: Client ABC)
✅ Test completed successfully!
```

## Integration with CI/CD

You can integrate these scripts into your deployment pipeline:

```yaml
# Example GitHub Actions step
- name: Sync Staff Assignments
  run: npm run sync-staff
  env:
    DB_URL: ${{ secrets.DB_URL }}
    NEXT_PUBLIC_DOMAIN: ${{ secrets.DOMAIN }}
```

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your environment variables are set correctly
3. Ensure your database is accessible
4. Review the STAFF_ASSIGNMENT_UPDATE.md file for detailed information about the changes