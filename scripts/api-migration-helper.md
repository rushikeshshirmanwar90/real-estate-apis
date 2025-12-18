# API Migration Helper Script

This document provides find-and-replace patterns to help speed up API migrations.

## 🔍 Find and Replace Patterns

### 1. Update Imports

**Find:**

```typescript
import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
```

**Replace with:**

```typescript
import { connectDB } from "@/lib/utils/db-connection";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId, isValidEmail } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
```

### 2. Update Database Connection

**Find:**

```typescript
await connect();
```

**Replace with:**

```typescript
await connectDB();
```

### 3. Update Console Logs

**Find:**

```typescript
console.log(
```

**Replace with:**

```typescript
logger.info(
```

**Find:**

```typescript
console.error(
```

**Replace with:**

```typescript
logger.error(
```

### 4. Update Error Responses

**Find:**

```typescript
return NextResponse.json(
  {
    message: "ERROR_MESSAGE",
  },
  { status: STATUS_CODE }
);
```

**Replace with:**

```typescript
return errorResponse("ERROR_MESSAGE", STATUS_CODE);
```

**Find:**

```typescript
return NextResponse.json(
  {
    message: "ERROR_MESSAGE",
    error: error,
  },
  { status: 500 }
);
```

**Replace with:**

```typescript
return errorResponse("ERROR_MESSAGE", 500);
```

### 5. Update Success Responses

**Find:**

```typescript
return NextResponse.json(data);
```

**Replace with:**

```typescript
return successResponse(data);
```

**Find:**

```typescript
return NextResponse.json(
  { message: "SUCCESS_MESSAGE", data: data },
  { status: 201 }
);
```

**Replace with:**

```typescript
return successResponse(data, "SUCCESS_MESSAGE", 201);
```

### 6. Update Function Signatures

**Find:**

```typescript
export const GET = async (req: NextRequest | Request) => {
```

**Replace with:**

```typescript
export const GET = async (req: NextRequest) => {
```

**Find:**

```typescript
export const POST = async (req: NextRequest | Request) => {
```

**Replace with:**

```typescript
export const POST = async (req: NextRequest) => {
```

### 7. Add .lean() to Queries

**Find:**

```typescript
await Model.find();
```

**Replace with:**

```typescript
await Model.find().lean();
```

**Find:**

```typescript
await Model.findById(id);
```

**Replace with:**

```typescript
await Model.findById(id).lean();
```

**Find:**

```typescript
await Model.findOne(
```

**Replace with:**

```typescript
await Model.findOne(
```

Then manually add `.lean()` before the semicolon.

## 🔧 Manual Updates Required

These require manual intervention:

### 1. Add Pagination

Add this code to GET endpoints that return lists:

```typescript
// Add after getting searchParams
const { page, limit, skip } = getPaginationParams(req);

// Replace simple find with:
const [items, total] = await Promise.all([
  Model.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
  Model.countDocuments(filter),
]);

const meta = createPaginationMeta(page, limit, total);

return successResponse({ items, meta }, `Retrieved ${items.length} item(s)`);
```

### 2. Add ObjectId Validation

Add before any database query using an ID:

```typescript
if (!isValidObjectId(id)) {
  return errorResponse("Invalid ID format", 400);
}
```

### 3. Add Email Validation

Add when processing email inputs:

```typescript
if (!isValidEmail(email)) {
  return errorResponse("Invalid email format", 400);
}
```

### 4. Update Error Handling

Replace:

```typescript
} catch (error: unknown) {
  console.error(error);
  return NextResponse.json(
    { message: "Error message", error: error },
    { status: 500 }
  );
}
```

With:

```typescript
} catch (error: unknown) {
  logger.error("Error message", error);

  if (error && typeof error === "object" && "name" in error && error.name === "ValidationError") {
    return errorResponse("Validation failed", 400, error);
  }

  return errorResponse("Failed to perform operation", 500);
}
```

### 5. Exclude Passwords

Add `.select("-password")` to user queries:

```typescript
// Before
const user = await User.findById(id);

// After
const user = await User.findById(id).select("-password").lean();
```

## 📋 Step-by-Step Migration Process

### For Each API File:

1. **Backup the file** (just in case)

   ```bash
   cp app/api/example/route.ts app/api/example/route.ts.backup
   ```

2. **Update imports** (use find-replace #1)

3. **Update database connection** (use find-replace #2)

4. **Update console logs** (use find-replace #3)

5. **Update error responses** (use find-replace #4)

6. **Update success responses** (use find-replace #5)

7. **Update function signatures** (use find-replace #6)

8. **Add .lean() to queries** (use find-replace #7)

9. **Add pagination** (manual - see above)

10. **Add validation** (manual - see above)

11. **Update error handling** (manual - see above)

12. **Test the endpoint**
    - Test GET single item
    - Test GET list with pagination
    - Test POST with valid data
    - Test POST with invalid data
    - Test PUT
    - Test DELETE
    - Test error cases

13. **Update checklist** in `API_UPDATE_CHECKLIST.md`

## 🎯 Quick Migration Template

Copy this template for each new API:

```typescript
import { connectDB } from "@/lib/utils/db-connection";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import {
  getPaginationParams,
  createPaginationMeta,
} from "@/lib/utils/pagination";
import { logger } from "@/lib/utils/logger";
import { Model } from "@/lib/models/Model";

export const GET = async (req: NextRequest) => {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid ID format", 400);
      }
      const item = await Model.findById(id).lean();
      if (!item) {
        return errorResponse("Item not found", 404);
      }
      return successResponse(item, "Item retrieved successfully");
    }

    const { page, limit, skip } = getPaginationParams(req);
    const [items, total] = await Promise.all([
      Model.find().skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      Model.countDocuments(),
    ]);
    const meta = createPaginationMeta(page, limit, total);

    return successResponse(
      { items, meta },
      `Retrieved ${items.length} item(s)`
    );
  } catch (error: unknown) {
    logger.error("Error fetching items", error);
    return errorResponse("Failed to fetch items", 500);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.requiredField) {
      return errorResponse("Required field is missing", 400);
    }

    const newItem = new Model(body);
    await newItem.save();

    return successResponse(newItem, "Item created successfully", 201);
  } catch (error: unknown) {
    logger.error("Error creating item", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create item", 500);
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid ID format", 400);
    }

    const body = await req.json();

    const updated = await Model.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return errorResponse("Item not found", 404);
    }

    return successResponse(updated, "Item updated successfully");
  } catch (error: unknown) {
    logger.error("Error updating item", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update item", 500);
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid ID format", 400);
    }

    const deleted = await Model.findByIdAndDelete(id).lean();

    if (!deleted) {
      return errorResponse("Item not found", 404);
    }

    return successResponse(deleted, "Item deleted successfully");
  } catch (error: unknown) {
    logger.error("Error deleting item", error);
    return errorResponse("Failed to delete item", 500);
  }
};
```

## 🧪 Testing Script

After updating each API, run these tests:

```bash
# Test GET single item
curl -X GET "http://localhost:8080/api/endpoint?id=VALID_ID"

# Test GET list with pagination
curl -X GET "http://localhost:8080/api/endpoint?page=1&limit=10"

# Test GET with invalid ID
curl -X GET "http://localhost:8080/api/endpoint?id=invalid"

# Test POST with valid data
curl -X POST "http://localhost:8080/api/endpoint" \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'

# Test POST with missing required field
curl -X POST "http://localhost:8080/api/endpoint" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test PUT
curl -X PUT "http://localhost:8080/api/endpoint?id=VALID_ID" \
  -H "Content-Type: application/json" \
  -d '{"field": "new value"}'

# Test DELETE
curl -X DELETE "http://localhost:8080/api/endpoint?id=VALID_ID"
```

## 📊 Progress Tracking

After updating each API:

1. ✅ Mark it complete in `API_UPDATE_CHECKLIST.md`
2. ✅ Test all CRUD operations
3. ✅ Verify error handling
4. ✅ Check pagination works
5. ✅ Confirm validation works
6. ✅ Review logs in console
7. ✅ Commit changes

## 🎯 Batch Update Strategy

### Week 1: High Priority (5 APIs)

- Day 1: `/api/contacts`
- Day 2: `/api/property`
- Day 3: `/api/building`
- Day 4: `/api/payment`
- Day 5: `/api/reference-leads`

### Week 2: Medium Priority (8 APIs)

- Day 1-2: User APIs (admin, staff, user)
- Day 3: Mail APIs (send-mail, send-otp)
- Day 4-5: Other APIs (broker, findUser, forget-password)

### Week 3: Low Priority (15+ APIs)

- Day 1-2: Home page APIs
- Day 3: Super admin APIs
- Day 4-5: Xsite APIs

## 💡 Pro Tips

1. **Use VS Code Multi-Cursor**: Select all occurrences and edit simultaneously
2. **Use Git**: Commit after each API update
3. **Test Immediately**: Don't update multiple APIs before testing
4. **Follow the Pattern**: Consistency is key
5. **Ask for Help**: Refer to documentation when stuck

## 🚨 Common Mistakes to Avoid

1. ❌ Forgetting to add `.lean()` to queries
2. ❌ Not validating ObjectIds before queries
3. ❌ Using `console.log` instead of `logger`
4. ❌ Forgetting to add pagination
5. ❌ Not handling validation errors separately
6. ❌ Exposing passwords in responses
7. ❌ Using wrong HTTP status codes
8. ❌ Not testing error cases

## ✅ Quality Checklist

Before marking an API as complete:

- [ ] All imports updated
- [ ] Database connection uses `connectDB()`
- [ ] All queries use `.lean()`
- [ ] Pagination added to list endpoints
- [ ] ObjectId validation added
- [ ] Error responses use `errorResponse()`
- [ ] Success responses use `successResponse()`
- [ ] Logging uses `logger` not `console`
- [ ] Validation errors handled separately
- [ ] All CRUD operations tested
- [ ] Error cases tested
- [ ] Pagination tested
- [ ] Checklist updated

---

**Happy Migrating! 🚀**

Remember: Slow and steady wins the race. It's better to update one API correctly than to rush through many with mistakes.
