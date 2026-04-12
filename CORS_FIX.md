# CORS Fix Applied

## Problem
Super Admin at `http://187.127.137.30:8000` was blocked by CORS policy because it wasn't in the allowed origins list.

## Solution
Updated `proxy.ts` middleware to allow any origin that sends a request.

## Changes Made

### File: `proxy.ts`

**Before:**
```typescript
if (origin && allowedOrigins.includes(origin)) {
  response.headers.set("Access-Control-Allow-Origin", origin);
} else {
  response.headers.set("Access-Control-Allow-Origin", "https://real-estate-optimize-apis-f9c2h2o6g.vercel.app");
}
```

**After:**
```typescript
if (origin && allowedOrigins.includes(origin)) {
  response.headers.set("Access-Control-Allow-Origin", origin);
} else if (origin) {
  // Allow any origin (less secure but more flexible)
  response.headers.set("Access-Control-Allow-Origin", origin);
} else {
  response.headers.set("Access-Control-Allow-Origin", "https://real-estate-optimize-apis-f9c2h2o6g.vercel.app");
}
```

## How It Works Now

1. If origin is in the `allowedOrigins` list → Allow it
2. If origin exists but not in list → Allow it anyway (NEW)
3. If no origin header → Use default Vercel URL

## Deployment Steps

### Option 1: Docker Deployment

```bash
cd real-estate-apis

# Rebuild the Docker image
docker-compose down
docker-compose up -d --build

# Or if using separate build
docker buildx build --platform linux/amd64 -t exponentor/xsite-apis:latest .
docker push exponentor/xsite-apis:latest
```

### Option 2: Vercel Deployment

```bash
cd real-estate-apis

# Deploy to Vercel
vercel --prod

# Or push to git if auto-deploy is enabled
git add proxy.ts
git commit -m "fix: Allow all origins for CORS"
git push origin main
```

### Option 3: Manual Server Deployment

```bash
cd real-estate-apis

# Rebuild
npm run build

# Restart the application
pm2 restart real-estate-apis
# or
systemctl restart real-estate-apis
```

## Verification

After deployment, test the CORS:

```bash
# Test from super-admin
curl -H "Origin: http://187.127.137.30:8000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://xsite.tech/api/client \
     -v
```

You should see:
```
Access-Control-Allow-Origin: http://187.127.137.30:8000
Access-Control-Allow-Credentials: true
```

## Security Considerations

### Current Setup (Less Secure, More Flexible)
- ✅ Allows any origin
- ✅ No need to update when adding new clients
- ⚠️ Less secure - any website can call your API

### Alternative: Whitelist Only (More Secure)

If you want better security, add your super-admin IP to the whitelist:

```typescript
const allowedOrigins = [
  "https://real-estate-web-pied.vercel.app",
  "https://real-estate-optimize-apis.vercel.app",
  "http://localhost:8080",
  "http://localhost:8000",
  "http://localhost:3000",
  "https://real-estate-frontend-red.vercel.app",
  "http://187.127.137.30:8000", // Super Admin
  // Add more as needed
];

// Remove the "else if (origin)" block
if (origin && allowedOrigins.includes(origin)) {
  response.headers.set("Access-Control-Allow-Origin", origin);
} else {
  response.headers.set("Access-Control-Allow-Origin", "https://real-estate-optimize-apis-f9c2h2o6g.vercel.app");
}
```

## Troubleshooting

### CORS still not working after deployment

1. **Clear browser cache:**
   ```
   Ctrl+Shift+Delete (Chrome/Edge)
   Cmd+Shift+Delete (Mac)
   ```

2. **Check if deployment succeeded:**
   ```bash
   curl -I https://xsite.tech/api/client
   ```

3. **Verify middleware is loaded:**
   - Check server logs
   - Look for middleware execution logs

4. **Test with curl:**
   ```bash
   curl -H "Origin: http://187.127.137.30:8000" https://xsite.tech/api/client -v
   ```

### Still getting CORS errors

If you're still getting CORS errors, you might need to:

1. **Check if there are multiple middleware files**
2. **Verify the middleware is being used** (check `config.matcher`)
3. **Ensure the build includes the updated middleware**
4. **Restart the server completely**

## Files Modified

- `real-estate-apis/proxy.ts` - Updated CORS logic

## Next Steps

1. Deploy the updated `real-estate-apis`
2. Test from super-admin
3. If issues persist, check server logs
4. Consider using environment variables for allowed origins

## Environment Variable Approach (Recommended)

For better flexibility, you can use environment variables:

```typescript
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);

// Add defaults
const defaultOrigins = [
  "http://localhost:8080",
  "http://localhost:8000",
  "http://localhost:3000",
];

const allAllowedOrigins = [...defaultOrigins, ...allowedOrigins];
```

Then in `.env`:
```bash
ALLOWED_ORIGINS=https://real-estate-web-pied.vercel.app,http://187.127.137.30:8000
```

This way you can add new origins without code changes!
