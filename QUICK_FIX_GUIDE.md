# 🚀 QUICK FIX GUIDE - Stop Data Loss During Deployments

## ⚡ IMMEDIATE ACTIONS (Do This Now!)

### 1. Backup Your Database (5 minutes)

```bash
# Create backup directory
mkdir -p /backups

# Backup entire database
mongodump --uri="YOUR_MONGODB_URI" --out=/backups/emergency-backup-$(date +%Y%m%d-%H%M%S)

# Verify backup was created
ls -lh /backups/
```

### 2. Disable Dangerous Migration Script (1 minute)

The script has been renamed to prevent accidental execution:
- ✅ `scripts/migrate-equipment.js` → `scripts/DANGEROUS_migrate-equipment.js.DISABLED`

**Verify:**
```bash
ls -la scripts/ | grep migrate
```

### 3. Add Safe Model Registration (10 minutes)

**File created:** `/lib/models/model-registry.ts`

**Update ONE model as a test:**

Edit `/lib/models/users/Staff.ts`:

```typescript
// OLD (UNSAFE):
// export const Staff = models.Staff || model("Staff", StaffSchema);

// NEW (SAFE):
import { safeModelRegistration } from '../model-registry';
export const Staff = safeModelRegistration("Staff", StaffSchema);
```

**Test it:**
```bash
npm run build
# If build succeeds, update remaining models
```

---

## 📋 STEP-BY-STEP FIX (30-60 minutes)

### Step 1: Update All Models to Use Safe Registration

Update these files:

1. `/lib/models/Project.ts`
2. `/lib/models/Building.ts`
3. `/lib/models/users/Staff.ts`
4. `/lib/models/users/Admin.ts`
5. `/lib/models/Xsite/Labor.ts`
6. `/lib/models/Xsite/Equipment.ts`
7. `/lib/models/Xsite/materials-activity.ts`
8. All other model files

**Pattern to replace:**

```typescript
// FIND:
const ModelName = models.ModelName || model("ModelName", ModelNameSchema);

// REPLACE WITH:
import { safeModelRegistration } from '../model-registry'; // or '../../model-registry' depending on depth
const ModelName = safeModelRegistration("ModelName", ModelNameSchema);
```

### Step 2: Fix Dangerous Bulk Delete in Property API

Edit `/app/api/property/route.ts` around line 222:

```typescript
// BEFORE (DANGEROUS):
const deleteResult = await UserCustomerDetails.deleteMany({});

// AFTER (SAFE):
// Require authentication and confirmation
const { searchParams } = new URL(req.url);
const confirm = searchParams.get("confirm");

if (confirm !== "DELETE_ALL_CUSTOMER_DATA") {
  return errorResponse(
    "Confirmation required. Add ?confirm=DELETE_ALL_CUSTOMER_DATA to proceed",
    400
  );
}

// Also check user role (add your auth check here)
// if (userRole !== 'super-admin') {
//   return errorResponse("Unauthorized", 403);
// }

const deleteResult = await UserCustomerDetails.deleteMany({});
```

### Step 3: Add Transaction Support to Project Deletion

Edit `/app/api/project/[id]/route.ts`:

```typescript
import { withOptionalTransaction } from "@/lib/utils/transaction-helper";

// Inside DELETE function, wrap the deletion logic:
const result = await withOptionalTransaction(async (session) => {
  // Get project
  const project = await Projects.findById(id).session(session).lean();
  if (!project) {
    throw new Error("Project not found");
  }

  // All delete operations with session
  const deletedActivities = await Activity.deleteMany(
    { projectId: id },
    { session }
  );
  
  const deletedMaterialActivities = await MaterialActivity.deleteMany(
    { projectId: id },
    { session }
  );
  
  // ... rest of deletions with { session }
  
  const deletedProject = await Projects.findByIdAndDelete(id, { session });
  
  return { deletedProject, cascadingDeleteSummary: { /* ... */ } };
});

return successResponse(result, "Project deleted successfully");
```

### Step 4: Make Schema Hooks Safer

Edit `/lib/models/Xsite/Labor.ts` around line 419:

```typescript
// BEFORE:
LaborSchema.pre('save', function(next) {
  if (this.count && this.perLaborCost) {
    this.totalCost = this.count * this.perLaborCost;
  }
  // ...
  next();
});

// AFTER (SAFER):
LaborSchema.pre('save', function(next) {
  // Only recalculate if values actually changed
  if (this.isModified('count') || this.isModified('perLaborCost')) {
    if (this.count && this.perLaborCost) {
      this.totalCost = this.count * this.perLaborCost;
    }
  }
  
  // Only set entityModel if entityType changed
  if (this.isModified('entityType')) {
    switch (this.entityType) {
      case 'project': this.entityModel = 'Projects'; break;
      case 'building': this.entityModel = 'Building'; break;
      case 'otherSection': this.entityModel = 'OtherSection'; break;
      case 'rowHouse': this.entityModel = 'RowHouse'; break;
    }
  }
  
  next();
});
```

Do the same for `/lib/models/Xsite/Equipment.ts` around line 195.

---

## ✅ TESTING CHECKLIST

### Before Deploying:

- [ ] Database backup created
- [ ] Migration script disabled/renamed
- [ ] All models updated to use `safeModelRegistration`
- [ ] Bulk delete endpoints have confirmation
- [ ] Transaction support added to cascading deletes
- [ ] Schema hooks made idempotent
- [ ] Code builds successfully: `npm run build`
- [ ] No TypeScript errors: `npm run lint`

### Test in Development:

```bash
# 1. Start dev server
npm run dev

# 2. Test model loading
curl http://localhost:8080/api/project

# 3. Check logs for model registration messages
# Should see: "[Model Registry] Registering new model: Projects"

# 4. Hot reload test - make a small change and save
# Should see: "[Model Registry] Hot reload detected for Projects, re-registering..."

# 5. Verify data integrity
node scripts/verify-data-integrity.js
```

### Test in Staging:

- [ ] Deploy to staging environment
- [ ] Run data integrity check
- [ ] Test all CRUD operations
- [ ] Verify no data loss
- [ ] Check logs for errors
- [ ] Monitor for 1 hour

### Production Deployment:

```bash
# 1. Final backup
mongodump --uri="$PROD_DB_URL" --out=/backups/pre-deployment-$(date +%Y%m%d-%H%M%S)

# 2. Deploy
npm run build
pm2 reload ecosystem.config.js --update-env

# 3. Immediate verification
node scripts/verify-data-integrity.js

# 4. Monitor logs
pm2 logs --lines 100

# 5. Test critical endpoints
curl https://your-api.com/api/project
curl https://your-api.com/api/equipment
curl https://your-api.com/api/labor
```

---

## 🆘 IF DATA IS LOST

### Immediate Recovery:

```bash
# 1. Stop the server
pm2 stop all

# 2. Restore from backup
mongorestore --uri="$DB_URL" --drop /backups/latest-backup

# 3. Verify restoration
node scripts/verify-data-integrity.js

# 4. Restart server
pm2 start all
```

### Check for Backup Collections:

```javascript
// Connect to MongoDB
mongo YOUR_MONGODB_URI

// List all collections
db.getCollectionNames()

// Look for backup collections (e.g., equipments_backup_*)
db.getCollectionNames().filter(name => name.includes('backup'))

// Restore from backup collection
db.equipments_backup_TIMESTAMP.find().forEach(doc => {
  delete doc._id; // Remove old _id
  db.equipments.insert(doc);
});
```

---

## 📊 MONITORING

### Add to package.json:

```json
{
  "scripts": {
    "verify-data": "node scripts/verify-data-integrity.js",
    "backup-db": "mongodump --uri=$DB_URL --out=backups/manual-$(date +%Y%m%d-%H%M%S)"
  }
}
```

### Run After Every Deployment:

```bash
npm run verify-data
```

### Set Up Automated Backups:

Add to crontab:
```bash
# Backup every 6 hours
0 */6 * * * cd /path/to/app && npm run backup-db

# Verify data integrity daily
0 9 * * * cd /path/to/app && npm run verify-data | mail -s "Data Integrity Report" admin@example.com
```

---

## 🎯 PRIORITY ORDER

If you have limited time, do these in order:

1. **CRITICAL (Do Now)**: Backup database
2. **CRITICAL (Do Now)**: Disable migration script
3. **HIGH (Today)**: Update model registration pattern
4. **HIGH (Today)**: Add confirmation to bulk deletes
5. **MEDIUM (This Week)**: Add transaction support
6. **MEDIUM (This Week)**: Make schema hooks safer
7. **LOW (When Possible)**: Set up automated backups

---

## 📞 SUPPORT

If you encounter issues:

1. Check logs: `pm2 logs`
2. Run verification: `node scripts/verify-data-integrity.js`
3. Check backup collections: `db.getCollectionNames()`
4. Restore from backup if needed

---

**Last Updated**: 2026-05-22
**Status**: Ready to implement
**Estimated Time**: 30-60 minutes
**Risk Level**: Low (all changes are backwards compatible)
