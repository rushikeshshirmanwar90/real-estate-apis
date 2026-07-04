# 🚀 Backend Restart and Testing Guide

## ⚠️ CRITICAL: You MUST Restart the Backend Server

The bearer token authentication has been updated in **126 API endpoints**, but the changes won't take effect until you restart the backend server.

## 🔧 Step 1: Stop the Current Backend Server

If your backend is currently running, stop it:

```bash
# Press Ctrl+C in the terminal where the server is running
# Or if running in background, find and kill the process:
lsof -ti:3000 | xargs kill -9
```

## 🚀 Step 2: Start the Backend Server

```bash
cd "/Users/chinmayshrimanwar/Desktop/pamu dada/app/real-estate-apis"
npm run dev
```

**Wait for the server to fully start**. You should see:
```
✓ Ready in X.XXs
○ Local: http://localhost:3000
```

## 🧪 Step 3: Test Bearer Token Authentication

### Option A: Using the Test Script (Recommended)

```bash
# In a new terminal, run:
cd "/Users/chinmayshrimanwar/Desktop/pamu dada/app/real-estate-apis"
node test-bearer-auth.js
```

**Expected Output:**
```
🧪 Bearer Token Authentication Test
=====================================

Test 1: GET /api/clients WITH bearer token
Status: 200
✅ SUCCESS: Bearer token authentication working!

Test 2: GET /api/clients WITHOUT bearer token
Status: 401
✅ SUCCESS: Correctly rejected unauthorized request!

=====================================
📊 Test Results:
  Test 1 (With Token): ✅ PASS
  Test 2 (Without Token): ✅ PASS
=====================================

🎉 All tests passed! Bearer token authentication is working correctly.
```

### Option B: Using curl

```bash
# Test WITH bearer token (should return 200)
curl -H "Authorization: Bearer eyJhbGciOiJIUIsInRbaDas2344rr308ohagn0wer4XVCJ9." \
     http://localhost:3000/api/clients?id=69db423932f75fa039cfb76f

# Test WITHOUT bearer token (should return 401)
curl http://localhost:3000/api/clients?id=69db423932f75fa039cfb76f
```

## 📱 Step 4: Test the Xsite Mobile App

1. **Make sure the backend is running** (from Step 2)

2. **Open the Xsite app** on your device/emulator

3. **Navigate to any feature** that makes API calls:
   - Dashboard
   - Clients list
   - Projects
   - Building management
   - etc.

4. **Check the logs** in your terminal/console:
   - You should see: `🔐 API Request: GET /api/clients`
   - You should see: `🔑 Authorization: Bearer eyJhbGciOiJIUIsInRb...`
   - You should see: `✅ API Response: 200 /api/clients`

5. **Verify no 401 errors**:
   - ❌ Before: `ERROR ❌ Error checking license: [AxiosError: Request failed with status code 401]`
   - ✅ After: `✅ License check successful`

## 🔍 Troubleshooting

### Issue: Still getting 401 errors

**Check 1: Backend server restarted?**
```bash
# Make sure you stopped the old server and started a new one
# The old server is still using the old code!
```

**Check 2: Bearer token matches?**
```bash
# Backend (.env):
grep API_BEARER_TOKEN real-estate-apis/.env

# Should show:
# API_BEARER_TOKEN=eyJhbGciOiJIUIsInRbaDas2344rr308ohagn0wer4XVCJ9.

# Mobile app (axiosConfig.ts):
grep BEARER_TOKEN Xsite/utils/axiosConfig.ts

# Should show:
# const BEARER_TOKEN = 'eyJhbGciOiJIUIsInRbaDas2344rr308ohagn0wer4XVCJ9.';
```

**Check 3: Server logs**
```bash
# Look for authentication errors in the server logs
# You should see the bearer token being validated
```

### Issue: Server won't start

**Check for port conflicts:**
```bash
# Kill any process using port 3000
lsof -ti:3000 | xargs kill -9

# Then restart
npm run dev
```

**Check for syntax errors:**
```bash
# Run TypeScript check
npm run build
```

### Issue: Mobile app not sending bearer token

**Check axios configuration:**
```bash
# Verify the token is set in Xsite/utils/axiosConfig.ts
cat Xsite/utils/axiosConfig.ts | grep "BEARER_TOKEN ="
```

**Check mobile app logs:**
- Look for: `🔐 API Request: GET /api/clients`
- Look for: `🔑 Authorization: Bearer eyJhbGciOiJIUIsInRb...`
- If missing, the axios interceptor isn't working

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Backend server starts without errors
2. ✅ Test script shows all tests passing
3. ✅ Mobile app logs show bearer token being sent
4. ✅ API responses are 200/201 instead of 401
5. ✅ No "Unauthorized" errors in mobile app
6. ✅ License check succeeds
7. ✅ All features in mobile app work correctly

## 📊 What Was Fixed

- **126 API endpoints** updated from `withBearerAuth` wrapper to `checkValidClient`
- **Bearer token** properly configured in `.env` file (fixed line break issue)
- **Consistent authentication** across all protected endpoints
- **Better error handling** with clear 401 responses

## 🎯 Expected Behavior

### Before Fix:
```
❌ Error checking license: [AxiosError: Request failed with status code 401]
```

### After Fix:
```
✅ License check successful
✅ Client data loaded
✅ All API calls working
```

## 📞 Need Help?

If you're still experiencing issues after following all steps:

1. Check that the backend server was **completely restarted**
2. Verify the bearer token in `.env` has **no line breaks**
3. Confirm the mobile app is using the **correct domain**
4. Check server logs for any error messages
5. Run the test script to isolate the issue

---

**Remember**: The most common issue is forgetting to restart the backend server! The code changes won't take effect until you restart.
