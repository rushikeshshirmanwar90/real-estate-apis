# 🧪 API Testing Guide

## Overview

This guide provides comprehensive instructions for testing all updated Real Estate APIs using Postman and automated scripts.

## 📋 Prerequisites

1. **Server Running**: Ensure your Next.js server is running

   ```bash
   npm run dev
   # Server should be running on http://localhost:8080
   ```

2. **Database Connected**: MongoDB should be accessible

3. **Test Data**: Have at least one client, user, and project in your database

## 🎯 Testing Methods

### Method 1: Postman Collection (Recommended)

#### Step 1: Import Collection

1. Open Postman
2. Click "Import" button
3. Select `postman-collection.json` file
4. Collection "Real Estate API - Complete Test Suite" will be imported

#### Step 2: Configure Variables

1. Click on the collection
2. Go to "Variables" tab
3. Update these variables:
   - `base_url`: http://localhost:8080 (or your server URL)
   - `test_email`: Your test user email
   - `test_password`: Your test user password
   - `client_id`: A valid client ID from your database

#### Step 3: Run Tests

**Option A: Run Entire Collection**

1. Click on collection name
2. Click "Run" button
3. Select all requests
4. Click "Run Real Estate API..."
5. View results

**Option B: Run Individual Tests**

1. Expand collection folders
2. Click on any request
3. Click "Send" button
4. View response and test results

#### Step 4: Review Results

- ✅ Green tests = Passed
- ❌ Red tests = Failed
- Check "Test Results" tab for details

### Method 2: Automated Node.js Script

#### Step 1: Run Test Script

```bash
# Make sure you have Node.js 18+ installed
node test-apis.js
```

#### Step 2: Review Output

The script will:

- Test all 14 updated APIs
- Show real-time results with colors
- Display summary at the end
- Exit with code 0 (success) or 1 (failure)

#### Step 3: Interpret Results

```
✓ Test passed (green)
✗ Test failed (red)
⊘ Test skipped (yellow)
```

### Method 3: Manual cURL Testing

#### Login API

```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

#### Get Clients with Pagination

```bash
curl -X GET "http://localhost:8080/api/clients?page=1&limit=10"
```

#### Get Leads

```bash
curl -X GET "http://localhost:8080/api/leads?clientId=YOUR_CLIENT_ID&page=1&limit=10"
```

#### Get Events

```bash
curl -X GET "http://localhost:8080/api/events?page=1&limit=10"
```

## 📊 Test Coverage

### 1. Login API (/api/login)

**Tests:**

- ✅ Valid credentials login
- ✅ Invalid credentials (401)
- ✅ Missing fields (400)
- ✅ Rate limiting (429 after 10 requests)
- ✅ Account lockout (after 5 failed attempts)

**Expected Responses:**

```json
// Success
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "email": "...", "userType": "..." },
    "token": "..."
  }
}

// Error
{
  "success": false,
  "message": "Invalid credentials"
}
```

### 2. Clients API (/api/clients)

**Tests:**

- ✅ Get all clients with pagination
- ✅ Get client by ID
- ✅ Get client by email
- ✅ Passwords not exposed
- ✅ Pagination metadata present

**Expected Response:**

```json
{
  "success": true,
  "message": "Retrieved 10 client(s) successfully",
  "data": {
    "clients": [...],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 3. Leads API (/api/leads)

**Tests:**

- ✅ Get leads with pagination
- ✅ Get single lead by ID
- ✅ Create new lead
- ✅ Update lead
- ✅ Delete lead
- ✅ Validation errors

**Expected Response:**

```json
{
  "success": true,
  "message": "Retrieved 5 lead(s) successfully",
  "data": {
    "leads": [...],
    "meta": { ... }
  }
}
```

### 4. Events API (/api/events)

**Tests:**

- ✅ Get all events with pagination
- ✅ Get single event by ID
- ✅ Create event
- ✅ Update event
- ✅ Delete event

### 5. Projects API (/api/project)

**Tests:**

- ✅ Get projects by clientId with pagination
- ✅ Get single project by ID
- ✅ Create project
- ✅ Update project
- ✅ Delete project

### 6. Contacts API (/api/contacts)

**Tests:**

- ✅ Get contacts with pagination
- ✅ Filter by clientId
- ✅ Filter by userId
- ✅ Create multiple contacts
- ✅ Transaction support
- ✅ User verification

### 7. Property API (/api/property)

**Tests:**

- ✅ Get properties by userId
- ✅ Add property to user
- ✅ Update property
- ✅ Delete property
- ✅ Validation

### 8. Building API (/api/building)

**Tests:**

- ✅ Get buildings with pagination
- ✅ Filter by projectId
- ✅ Create building
- ✅ Update building (PUT only, no PATCH)
- ✅ Delete building
- ✅ Transaction support

### 9. OTP API (/api/otp)

**Tests:**

- ✅ Send OTP
- ✅ Rate limiting (3 requests per 5 minutes)
- ✅ OTP hashing
- ✅ Expiration (10 minutes)

### 10. OTP Verify API (/api/otp/verify)

**Tests:**

- ✅ Verify valid OTP
- ✅ Verify expired OTP
- ✅ Verify invalid OTP
- ✅ Attempt limiting (5 max)

### 11. Password API (/api/password)

**Tests:**

- ✅ Update password
- ✅ Strong password validation
- ✅ Transaction support
- ✅ Updates both user and LoginUser models

## 🎯 Test Scenarios

### Scenario 1: Complete User Flow

1. **Login**

   ```bash
   POST /api/login
   ```

2. **Get User's Leads**

   ```bash
   GET /api/leads?clientId=xxx&page=1&limit=10
   ```

3. **Create New Lead**

   ```bash
   POST /api/leads
   ```

4. **Update Lead**
   ```bash
   PUT /api/leads?id=xxx
   ```

### Scenario 2: Pagination Testing

1. **Get First Page**

   ```bash
   GET /api/events?page=1&limit=5
   ```

2. **Get Second Page**

   ```bash
   GET /api/events?page=2&limit=5
   ```

3. **Verify Metadata**
   - Check `hasNextPage`
   - Check `hasPrevPage`
   - Check `totalPages`

### Scenario 3: Error Handling

1. **Invalid ObjectId**

   ```bash
   GET /api/leads?id=invalid-id
   # Should return 400
   ```

2. **Missing Required Fields**

   ```bash
   POST /api/leads
   { "name": "Test" }
   # Should return 400
   ```

3. **Not Found**
   ```bash
   GET /api/leads?id=507f1f77bcf86cd799439011
   # Should return 404
   ```

## 📈 Performance Testing

### Test Response Times

```bash
# Using curl with timing
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/events?page=1&limit=10
```

Create `curl-format.txt`:

```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

### Expected Performance

- **Simple GET**: < 100ms
- **GET with Pagination**: < 150ms
- **POST/PUT**: < 200ms
- **DELETE**: < 150ms

## 🐛 Troubleshooting

### Common Issues

**1. Connection Refused**

```
Error: connect ECONNREFUSED
```

**Solution**: Start your server with `npm run dev`

**2. 400 Bad Request**

```json
{
  "success": false,
  "message": "Invalid ID format"
}
```

**Solution**: Check that IDs are valid MongoDB ObjectIds

**3. 404 Not Found**

```json
{
  "success": false,
  "message": "Item not found"
}
```

**Solution**: Verify the resource exists in your database

**4. 429 Too Many Requests**

```json
{
  "success": false,
  "message": "Too many requests"
}
```

**Solution**: Wait for rate limit to reset (1 minute for login, 5 minutes for OTP)

**5. 500 Internal Server Error**

```json
{
  "success": false,
  "message": "Failed to perform operation"
}
```

**Solution**: Check server logs for detailed error information

### Debugging Tips

1. **Check Server Logs**

   ```bash
   # Server console will show structured logs
   [2024-12-10T10:00:00.000Z] [ERROR] Error message
   ```

2. **Verify Database Connection**

   ```bash
   # Check MongoDB is running
   mongosh
   ```

3. **Test with Minimal Data**
   - Start with simple GET requests
   - Verify data exists in database
   - Then test POST/PUT/DELETE

4. **Use Postman Console**
   - View → Show Postman Console
   - See detailed request/response logs

## ✅ Success Criteria

### All Tests Should Pass

- ✅ All GET endpoints return 200
- ✅ All POST endpoints return 201
- ✅ All PUT endpoints return 200
- ✅ All DELETE endpoints return 200
- ✅ Pagination works correctly
- ✅ Validation catches errors
- ✅ Rate limiting works
- ✅ No passwords in responses
- ✅ Transactions work atomically

### Performance Benchmarks

- ✅ Response times < 200ms
- ✅ No memory leaks
- ✅ Database connections properly closed
- ✅ No console.log statements (using logger)

## 📝 Test Report Template

After testing, document results:

```markdown
# API Test Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Local/Staging/Production]

## Summary

- Total Tests: X
- Passed: X
- Failed: X
- Success Rate: X%

## Failed Tests

1. [Test Name]
   - Expected: [Expected result]
   - Actual: [Actual result]
   - Reason: [Why it failed]

## Performance

- Average Response Time: Xms
- Slowest Endpoint: [Endpoint] (Xms)
- Fastest Endpoint: [Endpoint] (Xms)

## Recommendations

- [Any recommendations]
```

## 🚀 Next Steps

After successful testing:

1. ✅ Mark APIs as tested in `API_UPDATE_CHECKLIST.md`
2. ✅ Document any issues found
3. ✅ Fix any failing tests
4. ✅ Re-test after fixes
5. ✅ Deploy to staging
6. ✅ Run tests on staging
7. ✅ Deploy to production

## 📞 Support

If you encounter issues:

1. Check this testing guide
2. Review `API_FUNCTIONALITY_VERIFICATION.md`
3. Check `QUICK_REFERENCE.md` for API patterns
4. Review server logs for errors

---

**Happy Testing! 🧪**

Remember: Thorough testing now prevents production issues later!
