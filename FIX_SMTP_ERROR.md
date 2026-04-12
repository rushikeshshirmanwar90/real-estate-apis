# Fix SMTP "Missing credentials for PLAIN" Error

## 🔍 Problem

Error: `Missing credentials for "PLAIN"` when sending OTP emails.

This means your SMTP_USER and SMTP_PASS environment variables are not reaching your application.

---

## ✅ Solution

### Step 1: Identify Your Deployment Platform

Based on your logs showing `web-1`, you're likely using:
- Railway
- Render
- Vercel
- Or another cloud platform

### Step 2: Add Environment Variables to Your Platform

#### For Railway:
1. Go to your project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add these variables:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=rushikeshshrimanwar@gmail.com
SMTP_PASS=anoeipuattkwiaxl
```

5. Click "Deploy" or wait for auto-redeploy

#### For Render:
1. Go to your service dashboard
2. Click "Environment" in the left sidebar
3. Add these environment variables:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=rushikeshshrimanwar@gmail.com
SMTP_PASS=anoeipuattkwiaxl
```

4. Save and redeploy

#### For Vercel:
1. Go to Project Settings
2. Click "Environment Variables"
3. Add each variable:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=rushikeshshrimanwar@gmail.com
SMTP_PASS=anoeipuattkwiaxl
```

4. Redeploy your application

---

## 🔐 Important: Gmail App Password

The password `anoeipuattkwiaxl` looks like a Gmail App Password, which is correct!

If it's NOT an App Password, you need to create one:

### How to Create Gmail App Password:

1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Enable "2-Step Verification" (if not already enabled)
4. Go back to Security
5. Click "App passwords" (under 2-Step Verification)
6. Select "Mail" and "Other (Custom name)"
7. Name it "Real Estate App"
8. Click "Generate"
9. Copy the 16-character password
10. Use this password as `SMTP_PASS`

---

## 🧪 Test Your SMTP Configuration

### Option 1: Test Script (Local)

```bash
cd real-estate-apis
node scripts/test-email.js
```

### Option 2: Test via API

```bash
curl -X POST https://your-domain.com/api/otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@gmail.com",
    "OTP": 123456
  }'
```

---

## 🔍 Verify Environment Variables Are Set

### Check in your deployment platform:

Add this temporary debug endpoint to verify:

Create `real-estate-apis/app/api/debug-env/route.ts`:

```typescript
import { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  // ⚠️ REMOVE THIS ENDPOINT AFTER DEBUGGING!
  return Response.json({
    SMTP_HOST: process.env.SMTP_HOST || "NOT SET",
    SMTP_PORT: process.env.SMTP_PORT || "NOT SET",
    SMTP_USER: process.env.SMTP_USER || "NOT SET",
    SMTP_PASS: process.env.SMTP_PASS ? "SET (hidden)" : "NOT SET",
    SMTP_SECURE: process.env.SMTP_SECURE || "NOT SET",
  });
};
```

Then visit: `https://your-domain.com/api/debug-env`

**⚠️ DELETE THIS FILE AFTER DEBUGGING!**

---

## 🐛 Alternative: Check Transporter Initialization

The issue might be that environment variables are undefined when the transporter is created.

### Fix: Lazy Load Transporter

Update `real-estate-apis/lib/transporter.ts`:

```typescript
import nodemailer from "nodemailer";

// Lazy load transporter to ensure env vars are loaded
let transporterInstance: any = null;

const createEmailTransporter = () => {
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
  const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;

  // Log for debugging (remove in production)
  console.log('📧 Creating email transporter...');
  console.log('   SMTP_HOST:', SMTP_HOST);
  console.log('   SMTP_PORT:', SMTP_PORT);
  console.log('   SMTP_USER:', SMTP_USER || 'NOT SET');
  console.log('   SMTP_PASS:', SMTP_PASS ? 'SET' : 'NOT SET');

  if (!SMTP_USER || !SMTP_PASS) {
    console.error('❌ SMTP credentials not set!');
    throw new Error('SMTP_USER and SMTP_PASS must be set in environment variables');
  }

  const config = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
      checkServerIdentity: () => undefined,
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    ignoreTLS: false,
    requireTLS: false,
  };

  return nodemailer.createTransport(config);
};

// Export a getter function instead of the transporter directly
export const getTransporter = () => {
  if (!transporterInstance) {
    transporterInstance = createEmailTransporter();
  }
  return transporterInstance;
};

// For backward compatibility
export const transporter = {
  sendMail: (...args: any[]) => getTransporter().sendMail(...args),
  verify: (...args: any[]) => getTransporter().verify(...args),
};
```

---

## 📋 Checklist

- [ ] Environment variables added to deployment platform
- [ ] Using Gmail App Password (not regular password)
- [ ] Redeployed application
- [ ] Tested with debug endpoint
- [ ] Verified SMTP_USER and SMTP_PASS are set
- [ ] Removed debug endpoint after testing
- [ ] OTP emails working

---

## 🆘 Still Not Working?

### Check These:

1. **Gmail Security**: Make sure "Less secure app access" is OFF and you're using App Password
2. **2-Step Verification**: Must be enabled for App Passwords
3. **Environment Variables**: Check they're set in the correct environment (production/preview)
4. **Deployment**: Make sure you redeployed after adding variables
5. **Logs**: Check deployment logs for any SMTP-related errors

### Alternative Email Providers:

If Gmail continues to have issues, consider:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **AWS SES** (very cheap, reliable)
- **Resend** (modern, developer-friendly)

---

## 📞 Quick Fix Commands

```bash
# Check if variables are in .env
grep SMTP real-estate-apis/.env

# Test email locally
cd real-estate-apis && node scripts/test-email.js

# Check deployment logs
# (command depends on your platform)
railway logs
# or
render logs
# or
vercel logs
```
