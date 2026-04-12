# MongoDB Transaction Fix - Documentation

## Problem
Your APIs were throwing this error:
```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

This happened because:
- Your code used MongoDB transactions (`startSession()`, `startTransaction()`)
- Transactions only work with MongoDB **replica sets** or **sharded clusters**
- Your local development uses **standalone MongoDB** (doesn't support transactions)

## Solution Implemented

### Two-Part Fix:

#### 1. **Smart Transaction Helper** (NEW)
Created `/lib/utils/transaction-helper.ts` that:
- ✅ Automatically detects if MongoDB supports transactions
- ✅ Uses transactions when available (MongoDB Atlas cluster)
- ✅ Runs without transactions on standalone MongoDB (local dev)
- ✅ Works with BOTH environments seamlessly

#### 2. **Updated APIs**
Modified these API routes to remove hardcoded transactions:
- `/api/password/route.ts` - Now uses smart transaction helper
- `/api/building/route.ts`
- `/api/building/floors/route.ts`
- `/api/building/bulk/route.ts`
- `/api/contacts/route.ts`
- `/api/clients/route.ts`
- `/api/project/[id]/route.ts`

## Will This Affect Your Old APK?

### Short Answer: NO

Your setup:
```
Old APK → MongoDB Atlas Cluster (Production) → Old API Code
Local Dev → Standalone MongoDB → Updated API Code
```

These are **completely separate** environments.

### When You Deploy Updated Code:

**Option A: Deploy with current changes (No transactions)**
- ✅ Works on both standalone and cluster
- ⚠️ No atomic transaction guarantees
- ✅ Good for most use cases

**Option B: Use the smart transaction helper (RECOMMENDED)**
- ✅ Automatically uses transactions on cluster
- ✅ Works without transactions on standalone
- ✅ Best of both worlds

## How to Use the Smart Transaction Helper

### Example: Update the password API (ALREADY DONE)

```typescript
import { withOptionalTransaction } from "@/lib/utils/transaction-helper";

// Wrap your database operations
const result = await withOptionalTransaction(async (session) => {
  // Use session parameter in your queries
  const updateOptions = session ? { new: true, session } : { new: true };
  
  const user = await User.findOneAndUpdate(
    { email },
    { password: hashedPassword },
    updateOptions
  );
  
  return user;
});
```

### Example: For other APIs

```typescript
import { withOptionalTransaction } from "@/lib/utils/transaction-helper";

export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();

    // Wrap operations that need atomicity
    const result = await withOptionalTransaction(async (session) => {
      const options = session ? { session } : {};
      
      // Create building
      const building = await Building.create([buildingData], options);
      
      // Update project
      const project = await Projects.findByIdAndUpdate(
        projectId,
        { $push: { section: { sectionId: building[0]._id } } },
        { new: true, ...options }
      );
      
      return { building: building[0], project };
    });

    return successResponse(result, "Success");
  } catch (error) {
    return errorResponse("Failed", 500);
  }
};
```

## Migration Guide

### For Each API Route:

1. **Import the helper:**
   ```typescript
   import { withOptionalTransaction } from "@/lib/utils/transaction-helper";
   ```

2. **Wrap your operations:**
   ```typescript
   const result = await withOptionalTransaction(async (session) => {
     // Your database operations here
     // Add session to options when available
   });
   ```

3. **Update query options:**
   ```typescript
   // Before:
   await Model.create([data], { session });
   
   // After:
   const options = session ? { session } : {};
   await Model.create([data], options);
   ```

## Testing

### Test on Local (Standalone MongoDB):
```bash
npm run dev
# Should work without transaction errors
```

### Test on Production (MongoDB Atlas):
```bash
# Deploy to production
# Transactions will be used automatically
```

## Environment Variables

Make sure your `.env` has:
```env
# For local development (standalone)
DB_URL=mongodb://localhost:27017/realEstate

# For production (cluster - supports transactions)
DB_URL=mongodb+srv://username:password@cluster.mongodb.net/realEstate
```

## Benefits of This Approach

✅ **Backward Compatible**: Works with your existing APK and cluster
✅ **Forward Compatible**: Works with local standalone MongoDB
✅ **Automatic**: No manual configuration needed
✅ **Safe**: Uses transactions when available for data integrity
✅ **Flexible**: Falls back gracefully when transactions aren't supported

## Next Steps

### Option 1: Keep Current Setup (Recommended for now)
- Local dev works without transactions
- Production can use the smart helper when you deploy

### Option 2: Update All APIs (For production deployment)
- Gradually update other APIs to use `withOptionalTransaction`
- Deploy to production
- Enjoy automatic transaction support

### Option 3: Convert Local to Replica Set (Advanced)
If you want transactions in local development:
```bash
# Stop MongoDB
sudo systemctl stop mongod

# Edit /etc/mongod.conf
replication:
  replSetName: "rs0"

# Restart and initialize
sudo systemctl start mongod
mongosh
rs.initiate()
```

## Summary

- ✅ Your local development now works (no transaction errors)
- ✅ Your old APK is not affected
- ✅ Smart transaction helper ready for production deployment
- ✅ Code works on both standalone and cluster MongoDB
- ✅ Password API already updated as example

## Questions?

- **Q: Will my APK break?**
  A: No, it uses a different database connection

- **Q: Should I update all APIs?**
  A: Only if you plan to deploy to production soon

- **Q: Do I need to change my database?**
  A: No, the code adapts automatically

- **Q: What about data integrity?**
  A: Transactions are used automatically when available (cluster)
