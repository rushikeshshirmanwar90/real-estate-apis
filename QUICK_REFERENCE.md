# Quick Reference Card

## 🚀 Common Imports

```typescript
import { connectDB } from "@/lib/utils/db-connection";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId, isValidEmail } from "@/lib/utils/validation";
import {
  getPaginationParams,
  createPaginationMeta,
} from "@/lib/utils/pagination";
import { logger } from "@/lib/utils/logger";
```

## 📝 Response Patterns

### Success Response

```typescript
return successResponse(data, "Operation successful", 200);
// or
return successResponse(data, "Created successfully", 201);
```

### Error Response

```typescript
return errorResponse("Error message", 400);
// or with error object (dev only)
return errorResponse("Error message", 500, error);
```

## ✅ Validation Patterns

### Validate ObjectId

```typescript
if (!isValidObjectId(id)) {
  return errorResponse("Invalid ID format", 400);
}
```

### Validate Email

```typescript
if (!isValidEmail(email)) {
  return errorResponse("Invalid email format", 400);
}
```

### Validate Required Fields

```typescript
if (!field) {
  return errorResponse("Field is required", 400);
}
```

## 🔍 Query Patterns

### Get Single Item

```typescript
const item = await Model.findById(id).lean();
if (!item) {
  return errorResponse("Item not found", 404);
}
return successResponse(item, "Item retrieved successfully");
```

### Get List with Pagination

```typescript
const { page, limit, skip } = getPaginationParams(req);

const [items, total] = await Promise.all([
  Model.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
  Model.countDocuments(filter),
]);

const meta = createPaginationMeta(page, limit, total);

return successResponse({ items, meta }, `Retrieved ${items.length} item(s)`);
```

### Create Item

```typescript
const newItem = new Model(data);
await newItem.save();
return successResponse(newItem, "Item created successfully", 201);
```

### Update Item

```typescript
const updated = await Model.findByIdAndUpdate(
  id,
  { $set: data },
  { new: true, runValidators: true }
).lean();

if (!updated) {
  return errorResponse("Item not found", 404);
}

return successResponse(updated, "Item updated successfully");
```

### Delete Item

```typescript
const deleted = await Model.findByIdAndDelete(id).lean();

if (!deleted) {
  return errorResponse("Item not found", 404);
}

return successResponse(deleted, "Item deleted successfully");
```

## 🔒 Security Patterns

### Rate Limiting

```typescript
import { rateLimit } from "@/lib/utils/rate-limiter";

const rateLimitResult = rateLimit(req, { maxRequests: 10, windowMs: 60000 });
if (!rateLimitResult.allowed) {
  return errorResponse("Too many requests", 429);
}
```

### Authentication (Placeholder)

```typescript
import { requireAuth } from "@/lib/middleware/auth";

const authResult = await requireAuth(["admin", "staff"])(req);
if (!authResult.authorized) {
  return authResult.response;
}

const user = authResult.user;
```

## 📊 Logging Patterns

### Info Log

```typescript
logger.info("Operation completed", { userId, action });
```

### Error Log

```typescript
logger.error("Operation failed", error);
```

### Debug Log (dev only)

```typescript
logger.debug("Debug information", { data });
```

## 🔄 Transaction Pattern

```typescript
const session = await connectDB().then((m) => m.startSession());
session.startTransaction();

try {
  // Perform operations
  await Model1.create([data1], { session });
  await Model2.updateOne(filter, update, { session });

  await session.commitTransaction();
  return successResponse(result, "Success");
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

## 🎯 Complete API Template

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

// GET - List or single item
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

// POST - Create item
export const POST = async (req: NextRequest) => {
  try {
    await connectDB();
    const body = await req.json();

    // Validate required fields
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

// PUT - Update item
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

// DELETE - Delete item
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

## 📋 HTTP Status Codes

| Code | Meaning               | When to Use                        |
| ---- | --------------------- | ---------------------------------- |
| 200  | OK                    | Successful GET, PUT, DELETE        |
| 201  | Created               | Successful POST                    |
| 400  | Bad Request           | Invalid input, validation error    |
| 401  | Unauthorized          | Missing or invalid authentication  |
| 403  | Forbidden             | Authenticated but not authorized   |
| 404  | Not Found             | Resource doesn't exist             |
| 409  | Conflict              | Duplicate resource (email exists)  |
| 423  | Locked                | Account locked (too many attempts) |
| 429  | Too Many Requests     | Rate limit exceeded                |
| 500  | Internal Server Error | Unexpected server error            |

## 🔧 Common Fixes

### Replace console.log

```typescript
// ❌ Before
console.log("User created", user);

// ✅ After
logger.info("User created", { userId: user._id });
```

### Replace connect()

```typescript
// ❌ Before
await connect();

// ✅ After
await connectDB();
```

### Add .lean()

```typescript
// ❌ Before
const items = await Model.find();

// ✅ After
const items = await Model.find().lean();
```

### Exclude password

```typescript
// ❌ Before
const user = await User.findById(id);

// ✅ After
const user = await User.findById(id).select("-password").lean();
```

### Use proper responses

```typescript
// ❌ Before
return NextResponse.json({ message: "Success", data });

// ✅ After
return successResponse(data, "Success");
```

## 🎨 Best Practices

1. ✅ Always validate inputs
2. ✅ Always use `.lean()` for read-only queries
3. ✅ Always add pagination to list endpoints
4. ✅ Always use proper error responses
5. ✅ Always log errors with logger
6. ✅ Always exclude passwords from responses
7. ✅ Always validate ObjectIds before queries
8. ✅ Always use transactions for multi-step operations
9. ✅ Always handle validation errors separately
10. ✅ Always use proper HTTP status codes

## 🚫 Common Mistakes

1. ❌ Using `NextRequest | Request` instead of `NextRequest`
2. ❌ Using `console.log()` instead of `logger`
3. ❌ Forgetting to validate ObjectIds
4. ❌ Forgetting to add `.lean()` to queries
5. ❌ Not handling validation errors
6. ❌ Exposing error details in production
7. ❌ Not using pagination
8. ❌ Returning passwords in responses
9. ❌ Using wrong HTTP status codes
10. ❌ Not using centralized utilities

---

**Keep this card handy while updating APIs!** 📌
