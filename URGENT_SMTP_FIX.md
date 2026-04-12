# 🚨 URGENT: SMTP Variables Not Set in Deployment

## The Problem

Your logs show:
```
SMTP_USER: ❌ NOT SET
SMTP_PASS: ❌ NOT SET
Current values: SMTP_USER=undefined, SMTP_PASS=undefined
```

This means your deployment platform **does not have** these environment variables.

---

## ✅ THE FIX

You MUST add these environment variables to your deployment platform's dashboard.

### Step 1: Identify Your Platform

Based on your logs showing `web-1`, you're using one of these:
- Railway
- Render  
- Fly.io
- Or similar

### Step 2: Add Environment Variables

Go to your deployment platform and add these **5 variables**:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=rushikeshshrimanwar@gmail.com
SMTP_PASS=anoeipuattkwiaxl
```

---

## 📋 Platform-Specific Instructions

### If Using Railway:

1. Open https://railway.app
2. Go to your project
3. Click on your service
4. Click "Variables" tab
5. Click "New Variable"
6. Add each variable:
   ```
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_SECURE = false
   SMTP_USER = rushikeshshrimanwar@gmail.com
   SMTP_PASS = anoeipuattkwiaxl
   ```
7. Click "Deploy" or wait for auto-deploy

### If Using Render:

1. Open https://dashboard.render.com
2. Go to your service
3. Click "Environment" in the left sidebar
4. Click "Add Environment Variable"
5. Add each variable:
   ```
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_SECURE = false
   SMTP_USER = rushikeshshrimanwar@gmail.com
   SMTP_PASS = anoeipuattkwiaxl
   ```
6. Save (it will auto-redeploy)

### If Using Vercel:

1. Open https://vercel.com/dashboard
2. Go to your project
3. Click "Settings"
4. Click "Environment Variables"
5. Add each variable:
   ```
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_SECURE = false
   SMTP_USER = rushikeshshrimanwar@gmail.com
   SMTP_PASS = anoeipuattkwiaxl
   ```
6. Select "Production" environment
7. Click "Save"
8. Redeploy your application

### If Using Fly.io:

```bash
fly secrets set SMTP_HOST=smtp.gmail.com
fly secrets set SMTP_PORT=587
fly secrets set SMTP_SECURE=false
fly secrets set SMTP_USER=rushikeshshrimanwar@gmail.com
fly secrets set SMTP_PASS=anoeipuattkwiaxl
```

---

## 🧪 Verify It's Fixed

### Step 1: Check Variables Are Set

Visit this URL in your browser:
```
https://your-domain.com/api/debug-smtp
```

You should see:
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

If you see `❌ NOT SET`, the variables aren't configured yet.

### Step 2: Test OTP Sending

Try sending an OTP again. You should see in logs:
```
✅ Email transporter configured successfully
✅ OTP email sent successfully
```

---

## ⚠️ Important Notes

1. **Local .env file doesn't matter** - Deployment platforms don't read your local `.env` file
2. **You must add variables in the platform dashboard** - This is the ONLY way
3. **Redeploy after adding** - Some platforms auto-redeploy, others need manual trigger
4. **Check the right environment** - Make sure you're adding to "Production" not "Preview"

---

## 🔍 How to Find Your Deployment Platform

Check your deployment URL:
- `*.railway.app` → Railway
- `*.onrender.com` → Render
- `*.vercel.app` → Vercel
- `*.fly.dev` → Fly.io
- `*.herokuapp.com` → Heroku

Or check your git remotes:
```bash
git remote -v
```

---

## 📞 Quick Checklist

- [ ] Identified deployment platform
- [ ] Logged into platform dashboard
- [ ] Found environment variables section
- [ ] Added SMTP_HOST
- [ ] Added SMTP_PORT
- [ ] Added SMTP_SECURE
- [ ] Added SMTP_USER
- [ ] Added SMTP_PASS
- [ ] Saved changes
- [ ] Redeployed (if needed)
- [ ] Checked /api/debug-smtp
- [ ] All variables show ✅
- [ ] Tested OTP sending
- [ ] Email received

---

## 🆘 Still Not Working?

### Check These:

1. **Variables in correct environment?**
   - Make sure they're in "Production" not "Development"

2. **Redeployed after adding?**
   - Some platforms need manual redeploy

3. **Correct variable names?**
   - Must be exactly: `SMTP_USER` not `SMTP_USERNAME`
   - Must be exactly: `SMTP_PASS` not `SMTP_PASSWORD`

4. **No typos?**
   - Double-check spelling of variable names

5. **Platform-specific issues?**
   - Railway: Click "Deploy" button
   - Render: Auto-deploys on save
   - Vercel: Need to redeploy manually

---

## 💡 Why This Happens

Your local `.env` file has the variables:
```
SMTP_USER=rushikeshshrimanwar@gmail.com
SMTP_PASS=anoeipuattkwiaxl
```

But deployment platforms **don't read local files**. They need variables added through their dashboard.

Think of it like this:
- Local development: Reads `.env` file ✅
- Deployment platform: Reads platform dashboard ❌ (not set yet)

---

## ✅ Success Indicators

Once fixed, your logs will show:
```
📧 Creating email transporter...
   SMTP_HOST: smtp.gmail.com
   SMTP_PORT: 587
   SMTP_USER: rushikeshshrimanwar@gmail.com
   SMTP_PASS: ✅ SET
✅ Email transporter configured successfully
📧 Sending OTP email...
✅ OTP email sent successfully
```

---

## 🎯 Summary

**The Problem:** SMTP variables are in your local `.env` but NOT in your deployment platform

**The Solution:** Add SMTP variables to your deployment platform's dashboard

**The Test:** Visit `/api/debug-smtp` to verify

**The Result:** OTP emails will work!

---

## 📚 Related Documentation

- SMTP_TROUBLESHOOTING.md - Complete SMTP guide
- FIX_SMTP_ERROR.md - Detailed fix instructions
- SMTP_FIX_VISUAL.txt - Visual guide
