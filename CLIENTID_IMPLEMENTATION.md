# ClientId-Based Data Fetching Implementation

## Overview
Updated the staff and projects pages to fetch data based on the authenticated user's clientId instead of using hardcoded environment variables. This matches the implementation pattern from the xsite mobile app.

## Changes Made

### 1. Created ClientId Helper Functions (`functions/clientId.ts`)

New utility functions for managing client authentication:

- `getClientId()` - Retrieves the clientId from the authenticated user's localStorage data
- `getUserData()` - Gets the full user object from localStorage
- `isAdmin()` - Checks if the current user has admin privileges

These functions handle:
- Browser environment checks (SSR safety)
- Error handling and logging
- Fallback logic for different user types (clients use their own _id, staff/admin use clientId field)

### 2. Updated Staff Page (`app/(users)/staff/page.tsx`)

#### Before:
- Used hardcoded `process.env.NEXT_PUBLIC_CLIENT_ID`
- No error handling for missing clientId
- Single API endpoint

#### After:
- Fetches clientId from authenticated user on mount
- Validates clientId before making API calls
- Implements fallback API strategy:
  1. First tries new API: `/api/clients/staff?clientId=${clientId}`
  2. Falls back to old API: `/api/staff?clientId=${clientId}`
- Comprehensive error handling with user-friendly toast notifications
- Handles specific HTTP status codes (400, 404, network errors)
- Includes clientId in staff addition payload
- Detailed console logging for debugging

### 3. Updated Projects Page (`app/projects/page.tsx`)

#### Before:
- Used hardcoded `process.env.NEXT_PUBLIC_CLIENT_ID`
- Basic error handling
- No clientId validation

#### After:
- Fetches clientId from authenticated user on mount
- Validates clientId before making API calls
- Waits for clientId to be available before fetching projects
- Enhanced error handling with specific error messages
- User-friendly toast notifications for different error scenarios
- Empty state message when no projects found
- Detailed console logging for debugging

## Key Features

### Authentication Flow
1. User logs in through the multi-step login flow
2. User data (including clientId) is stored in localStorage
3. Pages retrieve clientId using `getClientId()` helper
4. API calls are made with the authenticated user's clientId

### Error Handling
Both pages now handle:
- Missing/expired session (no clientId)
- Invalid client configuration (400 errors)
- Not found errors (404)
- Network errors
- Unexpected errors

### User Experience
- Loading states while fetching data
- Clear error messages with actionable feedback
- Toast notifications for important events
- Retry functionality on errors
- Empty states with helpful messages

## API Endpoints Used

### Staff Page
- Primary: `GET /api/clients/staff?clientId=${clientId}`
- Fallback: `GET /api/staff?clientId=${clientId}`
- Add Staff: `POST /api/user` (with clientId in payload)

### Projects Page
- `GET /api/project?clientId=${clientId}`

## Benefits

1. **Security**: No hardcoded credentials in environment variables
2. **Multi-tenancy**: Each user sees only their organization's data
3. **Flexibility**: Works for different user types (clients, staff, admin)
4. **Reliability**: Fallback strategies and comprehensive error handling
5. **Debugging**: Extensive console logging for troubleshooting
6. **User Experience**: Clear feedback and error messages

## Testing Checklist

- [ ] Login as client and verify staff page shows correct data
- [ ] Login as client and verify projects page shows correct data
- [ ] Test with expired/missing session
- [ ] Test with invalid clientId
- [ ] Test network error scenarios
- [ ] Test empty states (no staff/projects)
- [ ] Test staff addition with clientId
- [ ] Verify fallback API works when primary fails
- [ ] Check console logs for proper debugging info
- [ ] Verify toast notifications appear correctly

## Migration Notes

### Removed Dependencies
- `NEXT_PUBLIC_CLIENT_ID` environment variable is no longer needed for these pages
- Can be removed from `.env` files if not used elsewhere

### Required Data Structure
The user object in localStorage must contain:
```typescript
{
  _id: string,           // User's own ID
  clientId?: string,     // Client/company ID (for staff/admin)
  userType: string,      // 'clients', 'staff', or 'admin'
  // ... other user fields
}
```

### Backward Compatibility
- Fallback API endpoints ensure compatibility with existing backend
- Works with both old and new API response formats
- Handles both `data` and `staffData` response fields

## Future Improvements

1. Create a custom React hook `useClientId()` for cleaner component code
2. Implement caching to reduce localStorage reads
3. Add refresh token logic for expired sessions
4. Create a global error boundary for authentication errors
5. Add analytics tracking for API failures
