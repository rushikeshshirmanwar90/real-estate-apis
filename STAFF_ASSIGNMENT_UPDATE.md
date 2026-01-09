# Staff Assignment System Update

## Problem
The `assignedProjects` field in the Staff model was empty even when staff were assigned to projects because:
1. The field had a complex nested schema that was never being populated
2. Project assignments were only stored in the `Projects` collection under `assignedStaff`
3. The `assignedProjects` field was dynamically populated at runtime by querying the Projects collection

## Solution
Updated the Staff model and created utility functions to maintain project assignments in both collections.

## Changes Made

### 1. Updated Staff Model (`lib/models/users/Staff.ts`)
- Simplified the `assignedProjects` schema from complex nested structure to a flat array
- New schema includes: `projectId`, `projectName`, `clientId`, `clientName`, `assignedAt`, `status`
- Removed the complex `ProjectDetailsSchema` and `projectDataSchema`

### 2. Created Utility Functions (`lib/utils/staffProjectUtils.ts`)
- `assignStaffToProject()`: Assigns staff to project and updates both collections
- `removeStaffFromProject()`: Removes staff from project and updates both collections  
- `updateStaffProjectStatus()`: Updates project status for staff (active/completed/paused)
- `syncStaffProjectAssignments()`: Syncs existing data from Projects to Staff collection

### 3. Updated API Routes (`app/api/(users)/staff/route.ts`)
- Staff assignment now uses `assignStaffToProject()` utility
- Staff removal now uses `removeStaffFromProject()` utility
- GET routes now use the actual `assignedProjects` field instead of dynamic queries
- Improved error handling and client information population

### 4. Created Migration Tools
- `scripts/syncStaffProjects.ts`: Command-line script to sync existing data
- `app/api/admin/sync-staff-projects/route.ts`: API endpoint to trigger sync and check stats
- `scripts/testStaffAssignment.ts`: Test script to verify functionality

## How to Use

### 1. Run Data Migration (One-time)
```bash
# Option 1: Use npm script (recommended)
npm run sync-staff

# Option 2: Run the script directly
npx ts-node scripts/syncStaffProjects.ts

# Option 3: Use the API endpoint
POST /api/admin/sync-staff-projects
```

### 2. Check Migration Status
```bash
GET /api/admin/sync-staff-projects
```

### 3. Test the System
```bash
# Option 1: Use npm script (recommended)
npm run test-staff

# Option 2: Run the script directly
npx ts-node scripts/testStaffAssignment.ts
```

### 4. Assign Staff to Project (API)
```bash
POST /api/staff?action=assign
{
  "staffId": "staff_id_here",
  "projectId": "project_id_here"
}
```

### 5. Remove Staff from Project (API)
```bash
DELETE /api/staff/[staffId]?projectId=project_id_here
```

## Benefits

1. **Data Consistency**: Project assignments are now stored in both collections
2. **Better Performance**: No need to query Projects collection when fetching staff data
3. **Rich Data**: Staff assignments include client information, assignment dates, and status
4. **Easier Queries**: Can directly query staff by assigned projects
5. **Status Tracking**: Can track if projects are active, completed, or paused
6. **Backward Compatible**: Existing API endpoints continue to work

## Data Structure

### Before (Dynamic)
```javascript
// Staff document
{
  assignedProjects: [] // Always empty in database
}

// Runtime population from Projects collection
staffObj.assignedProjects = ["Project Name 1", "Project Name 2"]
```

### After (Stored)
```javascript
// Staff document
{
  assignedProjects: [
    {
      projectId: ObjectId("..."),
      projectName: "Project Name 1",
      clientId: ObjectId("..."),
      clientName: "Client Name",
      assignedAt: Date,
      status: "active"
    }
  ]
}
```

## Migration Notes

- Run the sync script once after deploying the updated code
- The sync will populate `assignedProjects` for all existing staff based on current project assignments
- No data loss - all existing assignments are preserved
- The system maintains both the old structure (Projects.assignedStaff) and new structure (Staff.assignedProjects)

## Testing

Use the test script to verify:
1. Staff can be assigned to projects
2. Both collections are updated correctly
3. Data consistency is maintained
4. API endpoints return correct data

The updated system ensures that the `assignedProjects` field is always populated with accurate, up-to-date information.