# Server Restart Instructions - Registry Model Update

## Problem
The Registry model has been updated to make `address`, `aadharNumber`, and `panNumber` optional, but the server is still using the old cached model definition.

## Solution: Restart the Development Server

### Step 1: Stop the Current Server
1. Go to the terminal where `real-estate-apis` is running
2. Press `Ctrl + C` (or `Cmd + C` on Mac) to stop the server
3. Wait for the server to completely shut down

### Step 2: Clear Next.js Cache (Optional but Recommended)
Run these commands in the `real-estate-apis` directory:

```bash
# Navigate to the real-estate-apis directory
cd real-estate-apis

# Remove Next.js cache
rm -rf .next

# Remove node_modules cache (optional, only if issue persists)
# rm -rf node_modules/.cache
```

### Step 3: Restart the Server
```bash
# Start the development server
npm run dev
```

### Step 4: Test the Fix
1. Open the Shivai mobile app
2. Go to "Add Customer" form
3. Fill in the customer details
4. Click "Add Customer" button
5. ✅ Should work without Registry validation errors

## Why This is Necessary

### Mongoose Model Caching
- Mongoose caches model definitions in memory
- When you update a schema, the old definition remains in memory
- Next.js development server keeps the Node.js process running
- Model changes require a server restart to take effect

### What Was Changed
The Registry model was updated to:
- Make `address` optional (required: false)
- Make `aadharNumber` optional (required: false)
- Make `panNumber` optional (required: false)

These fields can now be empty during initial Registry creation and filled by customers later.

## Verification

After restarting, you should see:
```
✅ Created registry {id} for booking {bookingId}
✅ Property assigned successfully
POST /api/customer/assign-property 201
```

Instead of:
```
❌ Registry validation failed: address: Path `address` is required.
POST /api/customer/assign-property 500
```

## If Issue Persists

If you still see the validation error after restarting:

### 1. Check Database
The old Registry documents in MongoDB might have validation rules. Drop the collection:
```bash
# Connect to MongoDB
mongosh

# Switch to your database
use your_database_name

# Drop the Registry collection
db.registries.drop()

# Exit
exit
```

### 2. Hard Reset
```bash
# Stop the server (Ctrl+C)

# Remove all caches
rm -rf .next
rm -rf node_modules/.cache

# Reinstall dependencies (if needed)
npm install

# Restart server
npm run dev
```

### 3. Check Model File
Verify that `real-estate-apis/lib/models/Shivai/Registry.ts` has:
```typescript
address: {
  type: String,
  required: false,  // ← Should be false
},
aadharNumber: {
  type: String,
  required: false,  // ← Should be false
  // ...
},
panNumber: {
  type: String,
  required: false,  // ← Should be false
  // ...
},
```

## Expected Behavior After Fix

### Registry Creation (Draft Status)
```typescript
{
  bookingId: "...",
  customerName: "John Doe",
  mobileNumber: "9876543210",
  projectName: "Shivai Heights",
  flatNumber: "A-101",
  status: "draft",
  address: "",           // ✅ Empty is OK
  aadharNumber: "",      // ✅ Empty is OK
  panNumber: "",         // ✅ Empty is OK
}
```

### Customer Completion (Later)
Customer fills in the empty fields through the Registry form in the mobile app.

## Status
🔄 **Action Required**: Please restart the development server to apply the model changes.