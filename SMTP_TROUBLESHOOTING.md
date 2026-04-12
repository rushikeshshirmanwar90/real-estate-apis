# SMTP Error: "Missing credentials for PLAIN" - Complete Fix

## 🔴 The Problem

You're getting this error when trying to send OTP emails:
```
Error: Missing credentials for "PLAIN"
code: 'EAUTH'
```

This means your SMTP username and password are **not reaching your application**.

---

## ✅ The Solution (3 Steps)

### Step 1: Check Your Deployment Platform

Your logs show `web-1`, which means you're using a cloud platform like:
- **Railway** (most likely)
- **Render**
- **Vercel**
- **Fly.io**
- Or similar

### Step 2: Add Environment Variables

You need to add these 5 environment variables to your deployment platform:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=rushikeshshrimanwar@gmail.com
SMTP_PASS=anoeipuattkwiaxl
```

#### How to Add Variables by Platform:

**Railway:**
1. Open your project
2. Click your service
3. Go to "Variables" tab
4. Click "New Variable"
5. Add each variable above
6. Click "Deploy"

**Render:**
1. Open your service
2. Click "Environment" in sidebar
3. Click "Add Environment Variable"
4. Add each variable above
5. Save changes (auto-redeploys)

**Vercel:**
1. Go to Project Settings
2. Click "Environment Variables"
3. Add each variable
4. Select environment (Production/Preview/Development)
5. Redeploy

**Fly.io:**
```bash
fly secrets set SMTP_HOST=smtp.gmail.com
fly secrets set SMTP_PORT=587
fly secrets set SMTP_SECURE=false
fly secrets set SMTP_USER=rushikeshshrimanwar@gmail.com
fly secrets set SMTP_PASS=anoeipuattkwiaxl
```

### Step 3: Verify & Test

1. **Check variables are set:**
   Visit: `https://your-domain.com/api/debug-smtp`
   
   You should see all variables marked with ✅

2. **Test OTP sending:**
   Try sending an OTP again

3. **Clean up:**
   Delete the debug file: `app/api/debug-smtp/route.ts`

---

## 🔐 Gmail App Password Setup

If `anoeipuattkwiaxl` is NOT a Gmail App Password, create one:

### Steps:

1. Go to https://myaccount.google.com/
2. Click "Security"
3. Enable "2-Step Verification" (required!)
4. Go back to Security
5. Click "App passwords"
6. Select "Mail" and "Other"
7. Name it "Real Estate App"
8. Click "Generate"
9. Copy the 16-character password
10. Use this as `SMTP_PASS`

### Why App Password?

Google blocks regular passwords for security. App Passwords are:
- More secure
- Can be revoked individually
- Required for 2FA accounts

---

## 🧪 Testing

### Test 1: Check Environment Variables

```bash
# Visit this URL in your browser
https://your-domain.com/api/debug-smtp
```

Expected output:
```json
{
  "smtp": {
    "SMTP_HOST": "smtp.gmail.com",
    "SMTP_PORT": "587",
    "SMTP_USER": "rushikeshshrimanwar@gmail.com",
    "SMTP_PASS": "✅ SET (hidden for security)"
  }
}
```

### Test 2: Send Test OTP

```bash
curl -X POST https://your-domain.com/api/otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "OTP": 123456
  }'
```

Expected: Email sent successfully

### Test 3: Check Logs

Look for these log messages:
```
📧 Creating email transporter...
   SMTP_HOST: smtp.gmail.com
   SMTP_PORT: 587
   SMTP_USER: rushikeshshrimanwar@gmail.com
   SMTP_PASS: ✅ SET
✅ Email transporter configured successfully
```

---

## 🐛 Common Issues

### Issue 1: Variables Not Set
**Symptom:** Debug endpoint shows "❌ NOT SET"
**Fix:** Add variables to deployment platform and redeploy

### Issue 2: Wrong Environment
**Symptom:** Works locally, fails in production
**Fix:** Make sure variables are set for "Production" environment

### Issue 3: Old Deployment
**Symptom:** Variables are set but still failing
**Fix:** Trigger a new deployment to pick up new variables

### Issue 4: Invalid App Password
**Symptom:** "Invalid credentials" error
**Fix:** Generate a new Gmail App Password

### Issue 5: 2FA Not Enabled
**Symptom:** Can't find "App passwords" option
**Fix:** Enable 2-Step Verification first

---

## 📋 Verification Checklist

- [ ] Identified deployment platform (Railway/Render/Vercel/etc)
- [ ] Added all 5 SMTP environment variables
- [ ] Using Gmail App Password (not regular password)
- [ ] 2-Step Verification enabled on Gmail
- [ ] Redeployed application
- [ ] Checked `/api/debug-smtp` - all variables show ✅
- [ ] Tested OTP sending - email received
- [ ] Deleted debug endpoint file
- [ ] Checked deployment logs - no SMTP errors

---

## 🔍 How to Find Your Deployment Platform

Check your deployment logs or URL:

- **Railway**: URL like `*.railway.app`, logs show `railway`
- **Render**: URL like `*.onrender.com`, logs show `render`
- **Vercel**: URL like `*.vercel.app`, logs show `vercel`
- **Fly.io**: URL like `*.fly.dev`, logs show `fly`
- **Heroku**: URL like `*.herokuapp.com`, logs show `heroku`

Or check your git remotes:
```bash
git remote -v
```

---

## 🚨 Emergency Alternative

If Gmail continues to fail, use a dedicated email service:

### SendGrid (Recommended)
```bash
# Free tier: 100 emails/day
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun
```bash
# Free tier: 5,000 emails/month
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

### Resend (Modern)
```bash
# Free tier: 3,000 emails/month
# Use their API instead of SMTP
```

---

## 📞 Quick Commands

```bash
# Check local .env file
grep SMTP real-estate-apis/.env

# Test email locally
cd real-estate-apis
node scripts/test-email.js

# Check deployment logs (platform-specific)
railway logs
# or
render logs
# or
vercel logs
```

---

## ✅ Success Indicators

You'll know it's working when you see:

1. **In logs:**
   ```
   📧 Creating email transporter...
   ✅ Email transporter configured successfully
   📧 Sending OTP email...
   ✅ OTP email sent successfully
   ```

2. **In response:**
   ```json
   {
     "success": true,
     "message": "OTP sent successfully"
   }
   ```

3. **In inbox:**
   Email with OTP code received

---

## 🎯 Summary

**The Fix:**
1. Add SMTP environment variables to your deployment platform
2. Make sure you're using a Gmail App Password
3. Redeploy your application
4. Test with `/api/debug-smtp`
5. Send OTP and verify email is received

**Most Common Cause:**
Environment variables are in your local `.env` file but NOT in your deployment platform's environment configuration.

**Quick Test:**
Visit `https://your-domain.com/api/debug-smtp` to see if variables are set.
