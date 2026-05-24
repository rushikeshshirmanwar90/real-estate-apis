# Security Setup Guide

## 🚨 CRITICAL: Rotate All Credentials Immediately

The following credentials were exposed in the repository and **MUST BE ROTATED IMMEDIATELY**:

### 1. Database Credentials
- **MongoDB Username**: `exponentor_xsite`
- **MongoDB Password**: `REuxsphoinkeensthor123`
- **Action Required**: 
  1. Login to MongoDB server at `187.127.137.30:27017`
  2. Create a new user with a strong password
  3. Update `.env.local` with new credentials
  4. Delete the old user

### 2. Redis Password
- **Old Password**: `Exponentor@Rushikesh@123`
- **Action Required**:
  1. Login to Redis server at `187.127.137.30:6379`
  2. Run: `CONFIG SET requirepass "NEW_STRONG_PASSWORD"`
  3. Update `.env.local` with new password

### 3. JWT Secret
- **Old Secret**: `sjdlfjaorinaldjlf13\$zldsjflasjf`
- **Action Required**:
  1. Generate a new strong secret (minimum 32 characters)
  2. Use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  3. Update `.env.local` with new secret
  4. **WARNING**: This will invalidate all existing JWT tokens

### 4. Email Password
- **Email**: `growwithexponentor@gmail.com`
- **Old Password**: `htkscnnevkxborat`
- **Action Required**:
  1. Login to Google Account
  2. Go to Security > 2-Step Verification > App Passwords
  3. Generate a new app password
  4. Update `.env.local` with new password
  5. Revoke the old app password

### 5. API Bearer Token
- **Old Token**: `eyJhbGciOiJIUIsInRbaDas2344rr308ohagn0wer4XVCJ9.`
- **Action Required**:
  1. Generate a new bearer token
  2. Use: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
  3. Update `.env.local` with new token

### 6. Authentication Code
- **Old Code**: `Q7xLm92GpTCnB3sZgWAeYR8dMloK5Ujf8vrw02nl`
- **Action Required**:
  1. Generate a new authentication code
  2. Use: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
  3. Update `.env.local` with new code

---

## 📝 Environment Setup

### Step 1: Copy Example File
```bash
cd real-estate-apis
cp .env.example .env.local
```

### Step 2: Generate Strong Secrets

#### Generate JWT Secret (32+ characters)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Generate Bearer Token
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

#### Generate Authentication Code
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

#### Generate Cron Secret
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### Step 3: Update .env.local

Replace all placeholder values in `.env.local` with your actual credentials:

```env
# Database Configuration
DB_URL=mongodb://NEW_USERNAME:NEW_PASSWORD@187.127.137.30:27017/realEstate?authSource=admin
MONGODB_URI=mongodb://NEW_USERNAME:NEW_PASSWORD@187.127.137.30:27017/realEstate?authSource=admin

# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=187.127.137.30
REDIS_PORT=6379
REDIS_PASSWORD=NEW_REDIS_PASSWORD

# Security
JWT_SECRET=PASTE_GENERATED_JWT_SECRET_HERE
CRON_SECRET=PASTE_GENERATED_CRON_SECRET_HERE

# Email Configuration
SMTP_USER=your-email@gmail.com
SMTP_PASS=PASTE_GOOGLE_APP_PASSWORD_HERE

# API Bearer Token
API_BEARER_TOKEN=PASTE_GENERATED_BEARER_TOKEN_HERE

# Authentication Code
NEXT_PUBLIC_AUTHENTICATION_CODE=PASTE_GENERATED_AUTH_CODE_HERE
```

---

## 🔒 Security Best Practices

### 1. Never Commit Secrets
- `.env.local` is already in `.gitignore`
- Always use `.env.example` for documentation
- Never commit actual credentials

### 2. Use Strong Passwords
All passwords should:
- Be at least 16 characters long
- Include uppercase, lowercase, numbers, and special characters
- Be randomly generated (not dictionary words)
- Be unique (not reused across services)

### 3. Rotate Credentials Regularly
- Rotate database passwords every 90 days
- Rotate JWT secrets every 180 days
- Rotate API tokens every 90 days
- Monitor for unauthorized access

### 4. Use Secret Management
For production, consider using:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Cloud Secret Manager

### 5. Enable Redis
Redis is currently disabled. Enable it for:
- Better performance
- Distributed rate limiting
- Session management
- Caching

Set `REDIS_ENABLED=true` in `.env.local`

---

## 🔐 Password Policy

The application now enforces strong passwords:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

---

## 📊 Monitoring

### Check for Exposed Secrets
```bash
# Search for potential secrets in git history
git log -p | grep -i "password\|secret\|token"

# Use git-secrets to prevent future leaks
git secrets --install
git secrets --register-aws
```

### Monitor Failed Login Attempts
Failed login attempts are now tracked. Check logs for:
- Multiple failed attempts from same IP
- Account lockouts
- Unusual login patterns

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All credentials rotated
- [ ] `.env.local` not committed to git
- [ ] Strong JWT secret configured
- [ ] Redis enabled and secured
- [ ] Email credentials updated
- [ ] Database user has minimal required permissions
- [ ] Rate limiting enabled on all endpoints
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Input validation enabled
- [ ] Error messages don't leak sensitive info
- [ ] Logging configured (no sensitive data in logs)
- [ ] Backup strategy in place

---

## 📞 Support

If you suspect a security breach:
1. Immediately rotate all credentials
2. Check database and Redis logs for unauthorized access
3. Review application logs for suspicious activity
4. Contact your security team

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Redis Security](https://redis.io/topics/security)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
