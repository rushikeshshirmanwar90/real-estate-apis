# Staff Assignment Troubleshooting Guide

## Problem: assignedProjects Array is Empty

If the `assignedProjects` array in your Staff documents is empty, follow this step-by-step troubleshooting guide.

## Step 1: Diagnose the Current State

Run the diagnostic script to understand what's happening:

```bash
npm run diagnose-staff
```

This will show you:
- How many staff and projects exist
- How many staff have `assignedProjects` populated
- How many projects have `assignedStaff` populated
- Sample data from both collections
- Whether sync is needed

## Step 2: Common Scenarios and Solutions

### Scenario A: "SYNC NEEDED" Message
**Problem**: Projects have staff assignments but Staff documents don't
**Cause**: Migration hasn't been run yet
**Solution**:
```bash
# Run the migration
npm run sync-staff

# Verify it worked
npm run diagnose-staff

# Test the system
npm run test-staff
```

### Scenario B: "NO ASSIGNMENTS" Message
**Problem**: No staff are assigned to any projects yet
**Cause**: Fresh database or no assignments made
**Solution**:
```bash
# Assign staff to projects using the API
POST /api/(users)/staff?action=assign
{
  "staffId": "your_staff_id",
  "projectId": "your_project_id"
}

# Or use the alternative endpoint
POST /api/users/staff?action=assign
{
  "staffId": "your_staff_id", 
  "projectId": "your_project_id"
}
```

### Scenario C: Assignments Made But Still Empty
**Problem**: Using old assignment methods that bypass the new system
**Cause**: Direct database updates or old API calls
**Solution**:
```bash
# Force sync existing assignments
npm run sync-staff

# Check again
npm run diagnose-staff
```

## Step 3: Verify the Fix

After running the appropriate solution:

1. **Check the data**:
   ```bash
   npm run diagnose-staff
   ```

2. **Test assignments**:
   ```bash
   npm run test-staff
   ```

3. **Verify via API**:
   ```bash
   GET /api/(users)/staff?id=STAFF_ID&clientId=CLIENT_ID
   ```
   The response should include a populated `assignedProjects` array.

## Step 4: Prevent Future Issues

### Use Correct API Endpoints

**✅ Correct Assignment Endpoints**:
- `POST /api/(users)/staff?action=assign`
- `POST /api/users/staff?action=assign`

**✅ Correct Removal Endpoints**:
- `DELETE /api/(users)/staff/STAFF_ID?projectId=PROJECT_ID`
- `DELETE /api/users/staff/STAFF_ID?projectId=PROJECT_ID`

**❌ Don't Use Direct Database Updates**:
```javascript
// DON'T DO THIS
await Projects.findByIdAndUpdate(projectId, {
  assignedStaff: [...assignedStaff, newStaff]
});
```

**✅ Use Utility Functions Instead**:
```javascript
// DO THIS
import { assignStaffToProject } from "../lib/utils/staffProjectUtils";
await assignStaffToProject(staffId, projectId, projectName, clientId, clientName);
```

## Step 5: Advanced Troubleshooting

### Check Environment Variables
```bash
# Ensure these are set in your .env file
DB_URL=your_mongodb_connection_string
NEXT_PUBLIC_DOMAIN=your_domain
```

### Manual Database Check
If you have MongoDB access, you can check directly:

```javascript
// Check staff assignments
db.staffs.find({}, {firstName: 1, lastName: 1, assignedProjects: 1})

// Check project assignments  
db.projects.find({}, {name: 1, assignedStaff: 1})
```

### API Endpoint Status Check
```bash
# Check sync status
GET /api/admin/sync-staff-projects

# Response should show:
{
  "stats": {
    "totalStaff": 10,
    "staffWithProjects": 5,
    "totalProjects": 8,
    "projectsWithStaff": 5,
    "syncNeeded": false
  }
}
```

## Step 6: Common Error Messages

### "Staff is already assigned to this project"
- **Meaning**: The assignment already exists
- **Action**: This is expected behavior, no action needed

### "Project not found" or "Staff not found"
- **Meaning**: Invalid IDs provided
- **Action**: Verify the IDs exist in your database

### "Invalid staff ID format" or "Invalid project ID format"
- **Meaning**: IDs are not valid MongoDB ObjectIds
- **Action**: Check ID format (should be 24-character hex string)

### Import/Module Errors in Scripts
- **Meaning**: TypeScript or path issues
- **Action**: Ensure all dependencies are installed (`npm install`)

## Step 7: Monitoring and Maintenance

### Regular Health Checks
Add this to your deployment pipeline:
```bash
# After deployment, check system health
npm run diagnose-staff
```

### Backup Before Migration
Before running sync:
```bash
# Backup your database
mongodump --uri="your_connection_string" --out=backup_before_sync
```

### Performance Monitoring
The sync operation processes all projects and staff. For large databases:
- Run during low-traffic periods
- Monitor database performance
- Consider running in batches if needed

## Need Help?

If you're still experiencing issues:

1. **Check the logs**: Look for error messages in your application logs
2. **Run diagnostics**: `npm run diagnose-staff` provides detailed information
3. **Verify data**: Use MongoDB Compass or similar tools to inspect your data
4. **Test incrementally**: Try assigning one staff member to one project first

## Quick Reference Commands

```bash
# Diagnose current state
npm run diagnose-staff

# Run migration (one-time)
npm run sync-staff  

# Test the system
npm run test-staff

# Check via API
GET /api/admin/sync-staff-projects
```