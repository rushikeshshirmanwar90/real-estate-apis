# Fix 404 Errors on Home Page

## Problem
The home page (`app/page.tsx`) was showing 404 errors when trying to fetch hero sections and other homepage data. This was happening because:

1. The page was using hardcoded `process.env.NEXT_PUBLIC_CLIENT_ID` instead of the authenticated user's clientId
2. 404 errors were being treated as critical errors instead of normal "no data yet" states
3. New clients don't have homepage sections created yet, which is normal

## Solution Applied

### 1. Updated ClientId Fetching
Changed from hardcoded environment variable to dynamic clientId from authenticated user:

**Before:**
```typescript
const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || ""
```

**After:**
```typescript
const [clientId, setClientId] = useState<string | null>(null);

useEffect(() => {
  const fetchClientId = () => {
    const id = getClientId();
    if (!id) {
      toast.error('Session expired. Please log in again.');
      return;
    }
    setClientId(id);
  };
  fetchClientId();
}, []);
```

### 2. Added Graceful 404 Handling
Updated all fetch functions to handle 404 errors gracefully by setting empty states instead of showing errors:

#### Hero Section
```typescript
catch (error: any) {
  if (error.response?.status === 404) {
    console.log('ℹ️ No hero section found (404) - this is normal for new clients');
    setHeroSection({ clientId, details: [] });
  } else {
    handleError(error, 'fetching hero section')
  }
}
```

#### About Us
```typescript
catch (error: any) {
  if (error.response?.status === 404) {
    console.log('ℹ️ No about us section found (404) - this is normal for new clients');
    setAboutUs({ clientId, subTitle: '', description: '', image: '', points: [] });
  } else {
    handleError(error, 'fetching about us section')
  }
}
```

#### Our Services
```typescript
catch (error: any) {
  if (error.response?.status === 404) {
    console.log('ℹ️ No our services section found (404) - this is normal for new clients');
    setOurServices({ clientId, subTitle: '', services: [] });
  } else {
    handleError(error, 'fetching our services')
  }
}
```

#### Our Team
```typescript
catch (error: any) {
  if (error.response?.status === 404) {
    console.log('ℹ️ No our team section found (404) - this is normal for new clients');
    setOurTeam({ clientId, subTitle: '', teamMembers: [] });
  } else {
    handleError(error, 'fetching our team')
  }
}
```

#### FAQ
```typescript
catch (error: any) {
  if (error.response?.status === 404) {
    console.log('ℹ️ No FAQ section found (404) - this is normal for new clients');
    setFAQ({ clientId, subTitle: '', FAQs: [] });
  } else {
    handleError(error, 'fetching FAQ')
  }
}
```

### 3. Added Better Logging
All fetch functions now include:
- Log when clientId is not available
- Log when fetching data
- Log when 404 occurs (informational, not error)
- Log when data loads successfully

## Benefits

1. **No More 404 Errors**: 404 responses are now handled gracefully
2. **Better UX**: New clients see empty states instead of errors
3. **Dynamic ClientId**: Uses authenticated user's clientId instead of hardcoded value
4. **Better Debugging**: Enhanced logging helps troubleshoot issues
5. **Consistent Behavior**: All fetch functions handle errors the same way

## What This Means

### For New Clients
- Home page will load without errors
- Empty sections will be shown with "Add" buttons
- Can start adding content to each section

### For Existing Clients
- Home page loads normally with existing data
- No change in functionality
- Better error handling if data is missing

### For Developers
- Easier to debug with better logging
- Consistent error handling pattern
- Clear distinction between "no data" (404) and actual errors

## Testing Checklist

After applying this fix:
- [ ] Home page loads without 404 errors
- [ ] Empty sections show properly for new clients
- [ ] Existing data loads correctly for clients with data
- [ ] Console shows informational logs, not errors
- [ ] Can add new content to empty sections
- [ ] ClientId is fetched from authenticated user
- [ ] Session expiration is handled properly

## Related Files Updated

1. **`app/page.tsx`**
   - Changed clientId from env variable to dynamic fetch
   - Added 404 handling to all fetch functions
   - Enhanced logging throughout

2. **`functions/clientId.ts`** (already created)
   - Helper function to get clientId from localStorage
   - Used by home page and other pages

## Common Scenarios

### Scenario 1: New Client Login
1. Client logs in for the first time
2. Home page loads with clientId from auth
3. All sections return 404 (no data yet)
4. Empty states are shown
5. Client can start adding content

### Scenario 2: Existing Client Login
1. Client logs in
2. Home page loads with clientId from auth
3. Existing sections load successfully
4. Data is displayed normally

### Scenario 3: Session Expired
1. User tries to access home page
2. No clientId found in localStorage
3. Toast error shown: "Session expired. Please log in again."
4. User redirected to login

## Prevention

To prevent similar issues in the future:
- Always use `getClientId()` helper instead of env variables
- Handle 404 as "no data" state, not error
- Add informational logging for debugging
- Set empty states when data doesn't exist
- Check if clientId exists before making API calls

## Next Steps

If you still see errors:
1. Check browser console for specific error messages
2. Verify clientId is correct using `/debug-auth` page
3. Check if API endpoints exist and are working
4. Verify database has the client record
5. Check network tab to see actual API responses
