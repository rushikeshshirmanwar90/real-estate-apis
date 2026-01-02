# Staff-Client Two-Way Relationship

## Overview
Implemented a two-way relationship between Staff and Client models to maintain data consistency.

## Changes Made

### 1. Updated Client Model
**File:** `lib/models/super-admin/Client.ts`

Added `staffs` array to store staff IDs:
```typescript
staffs: {
  type: [String],
  required: false
}
```

### 2. Updated Staff Assignment API
**File:** `app/api/users/staff/assign-client/route.ts`

#### POST - Assign Staff to Client
Now performs two operations:
1. ✅ Adds `clientId` to staff's `clientIds` array
2. ✅ Adds `staffId` to client's `staffs` array

**Example:**
```typescript
// Staff Model
{
  _id: "staff123",
  clientIds: ["client456"] // ← Added
}

// Client Model
{
  _id: "client456",
  staffs: ["staff123"] // ← Added
}
```

#### DELETE - Remove Staff from Client
Now performs two operations:
1. ✅ Removes `clientId` from staff's `clientIds` array
2. ✅ Removes `staffId` from client's `staffs` array

### 3. New API Endpoint
**File:** `app/api/clients/staff/route.ts`

**Endpoint:** `GET /api/clients/staff?clientId={id}`

Fetches all staff members for a client using the client's `staffs` array.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "staff123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "site-engineer",
      "clientIds": ["client456"]
    }
  ],
  "message": "Retrieved 1 staff member(s) successfully"
}
```

## Benefits

### 1. Data Consistency
- Both models always stay in sync
- No orphaned relationships
- Easy to query from either direction

### 2. Performance
- Can fetch all staff for a client without complex queries
- Direct array lookup instead of filtering

### 3. Flexibility
- Query staff by client: `GET /api/clients/staff?clientId={id}`
- Query clients by staff: Use existing staff API with `clientIds`

## API Usage

### Assign Staff to Client
```bash
POST /api/users/staff/assign-client
Content-Type: application/json

{
  "staffId": "staff123",
  "clientIds": ["client456"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "staffId": "staff123",
    "staffName": "John Doe",
    "clientIds": ["client456"],
    "newlyAssignedClientIds": ["client456"],
    "clientUpdateResults": [
      {
        "clientId": "client456",
        "success": true,
        "message": "Staff added to client"
      }
    ],
    "assignedAt": "2026-01-03T..."
  }
}
```

### Remove Staff from Client
```bash
DELETE /api/users/staff/assign-client?staffId=staff123&clientIds=client456
```

**Response:**
```json
{
  "success": true,
  "data": {
    "staffId": "staff123",
    "staffName": "John Doe",
    "clientIds": [],
    "removedClientIds": ["client456"],
    "clientUpdateResults": [
      {
        "clientId": "client456",
        "success": true,
        "message": "Staff removed from client"
      }
    ],
    "removedAt": "2026-01-03T..."
  }
}
```

### Get All Staff for Client
```bash
GET /api/clients/staff?clientId=client456
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "staff123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phoneNumber": "1234567890",
      "role": "site-engineer",
      "clientIds": ["client456"],
      "assignedProjects": []
    }
  ],
  "message": "Retrieved 1 staff member(s) successfully"
}
```

## Data Flow

### When Assigning Staff:
```
1. Validate staff exists
2. Validate client exists
3. Update Staff.clientIds ← Add clientId
4. Update Client.staffs ← Add staffId
5. Return success with both updates
```

### When Removing Staff:
```
1. Validate staff exists
2. Validate client exists
3. Update Staff.clientIds ← Remove clientId
4. Update Client.staffs ← Remove staffId
5. Return success with both updates
```

### When Fetching Staff:
```
Option 1: By Client
GET /api/clients/staff?clientId=X
→ Find Client
→ Get staffs array
→ Find all Staff where _id in staffs

Option 2: By Staff
GET /api/users/staff?email=X
→ Find Staff
→ Return with clientIds array
```

## Error Handling

### Assignment Errors:
- Staff not found → 404
- Client not found → 404
- Already assigned → 409
- Invalid ID format → 400

### Client Update Failures:
- Logged but doesn't fail the operation
- Included in `clientUpdateResults` array
- Can be retried manually if needed

## Migration

If you have existing staff with `clientIds` but clients without `staffs`:

```javascript
// Run this script to sync existing data
const syncStaffClientRelationship = async () => {
  const allStaff = await Staff.find({});
  
  for (const staff of allStaff) {
    if (staff.clientIds && staff.clientIds.length > 0) {
      for (const clientId of staff.clientIds) {
        const client = await Client.findById(clientId);
        if (client) {
          const staffs = client.staffs || [];
          if (!staffs.includes(staff._id.toString())) {
            staffs.push(staff._id.toString());
            await Client.findByIdAndUpdate(clientId, { staffs });
            console.log(`Added staff ${staff._id} to client ${clientId}`);
          }
        }
      }
    }
  }
};
```

## Testing

### Test Assignment:
1. Create a staff member
2. Assign to client via QR or manual
3. Check staff's `clientIds` array
4. Check client's `staffs` array
5. Both should contain the IDs

### Test Removal:
1. Remove staff from client
2. Check staff's `clientIds` array
3. Check client's `staffs` array
4. Both should be empty

### Test Fetching:
1. Assign multiple staff to client
2. Call `GET /api/clients/staff?clientId=X`
3. Should return all assigned staff

## Notes

- The relationship is maintained automatically
- No manual updates needed
- Both arrays stay in sync
- Queries work from either direction
- Error handling ensures data consistency

This implementation ensures that staff-client relationships are always accurate and can be queried efficiently from either side!
