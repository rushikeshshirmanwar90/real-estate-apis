# Guide to Update Remaining APIs

## Pattern to Follow

All remaining APIs should follow this pattern:

### 1. Update Imports

**Replace:**

```typescript
import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
```

**With:**

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

### 2. Update GET Endpoints

**Before:**

```typescript
export const GET = async (req: NextRequest | Request) => {
  try {
    await connect();
    const data = await Model.find();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error", error }, { status: 500 });
  }
};
```

**After:**

```typescript
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

    // Pagination
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
```

### 3. Update POST Endpoints

**Before:**

```typescript
export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();
    const body = await req.json();
    const newItem = new Model(body);
    await newItem.save();
    return NextResponse.json(
      { message: "Created", data: newItem },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error", error }, { status: 500 });
  }
};
```

**After:**

```typescript
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
```

### 4. Update PUT Endpoints

**Before:**

```typescript
export const PUT = async (req: NextRequest | Request) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();
    const updated = await Model.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json({ message: "Updated", data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error", error }, { status: 500 });
  }
};
```

**After:**

```typescript
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
```

### 5. Update DELETE Endpoints

**Before:**

```typescript
export const DELETE = async (req: NextRequest | Request) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const deleted = await Model.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error", error }, { status: 500 });
  }
};
```

**After:**

```typescript
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

## Specific API Updates Needed

### `/api/contacts/route.ts`

- Add pagination to GET
- Add transaction support to POST (updates user verification)
- Validate email format
- Use `.lean()` for queries

### `/api/property/route.ts`

- Add pagination to GET
- Validate ObjectId formats
- Use `.lean()` for queries
- Fix PATCH method (should be POST for adding payments)

### `/api/building/route.ts`

- Add pagination to GET
- Remove commented code
- Add proper validation
- Use transactions for POST (updates project)

### `/api/payment/route.ts`

- Validate all inputs
- Use proper error responses
- Add `.lean()` to queries
- Simplify DELETE parameter handling

### `/api/reference-leads/route.ts`

- Add pagination to GET
- Validate inputs
- Use proper error responses
- Add `.lean()` to queries

### `/api/send-mail/route.tsx`

- Add rate limiting
- Validate email format
- Add proper error handling
- Add logging

### `/api/(users)/admin/route.ts`

- Already has helper functions, just update imports
- Add pagination
- Use centralized utilities
- Add `.lean()` to queries

### `/api/(users)/staff/route.ts`

- Already has helper functions, just update imports
- Add pagination
- Use centralized utilities
- Add `.lean()` to queries

### `/api/(users)/user/route.ts`

- Add pagination
- Simplify complex logic
- Use centralized utilities
- Add `.lean()` to queries

## Common Mistakes to Avoid

1. ❌ Don't use `NextRequest | Request` - use just `NextRequest`
2. ❌ Don't use `console.log()` - use `logger.info()`, `logger.error()`, etc.
3. ❌ Don't return raw data - use `successResponse()` or `errorResponse()`
4. ❌ Don't forget to validate ObjectIds before queries
5. ❌ Don't forget to add `.lean()` to read-only queries
6. ❌ Don't expose error details in production
7. ❌ Don't forget pagination for list endpoints
8. ❌ Don't use `await connect()` - use `await connectDB()`
9. ❌ Don't return passwords in responses
10. ❌ Don't forget to handle validation errors

## Testing Checklist

After updating each API, test:

- [ ] GET single item by ID
- [ ] GET all items with pagination
- [ ] GET with invalid ID format
- [ ] GET with non-existent ID
- [ ] POST with valid data
- [ ] POST with missing required fields
- [ ] POST with invalid data
- [ ] PUT with valid data
- [ ] PUT with invalid ID
- [ ] PUT with non-existent ID
- [ ] DELETE with valid ID
- [ ] DELETE with invalid ID
- [ ] DELETE with non-existent ID
- [ ] Rate limiting (if applicable)
- [ ] Error responses are consistent
- [ ] Success responses are consistent

## Quick Reference

### Import Template

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

### Validation Template

```typescript
if (!id) {
  return errorResponse("ID is required", 400);
}

if (!isValidObjectId(id)) {
  return errorResponse("Invalid ID format", 400);
}

if (!isValidEmail(email)) {
  return errorResponse("Invalid email format", 400);
}
```

### Query Template

```typescript
// Single item
const item = await Model.findById(id).lean();

// List with pagination
const { page, limit, skip } = getPaginationParams(req);
const [items, total] = await Promise.all([
  Model.find().skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
  Model.countDocuments(),
]);
const meta = createPaginationMeta(page, limit, total);
```

### Error Handling Template

```typescript
try {
  // ... code
} catch (error: unknown) {
  logger.error("Error message", error);

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "ValidationError"
  ) {
    return errorResponse("Validation failed", 400, error);
  }

  return errorResponse("Failed to perform operation", 500);
}
```
