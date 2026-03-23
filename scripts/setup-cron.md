# License Management Cron Job Setup

This document explains how to set up the daily license decrement cron job.

## Overview

The license management system requires a daily cron job to automatically decrement client licenses by 1 day. When a license reaches 0, the client and all their admins will lose access to the application.

## Files

- `scripts/daily-license-decrement.js` - The main cron script
- `app/api/license/decrement/route.ts` - API endpoint for license decrementation
- `lib/middleware/licenseCheck.ts` - Middleware for checking license access

## Setup Instructions

### 1. Environment Variables

Make sure these environment variables are set:

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/your-database-name

# Optional (for API mode)
NEXT_PUBLIC_DOMAIN=https://your-domain.com
USE_API=true  # Set to 'true' to use API endpoint instead of direct DB access
```

### 2. Install Dependencies

The script requires these Node.js packages:

```bash
npm install axios mongodb
```

### 3. Make Script Executable

```bash
chmod +x scripts/daily-license-decrement.js
```

### 4. Test the Script

Run manually to test:

```bash
# Using direct database access
node scripts/daily-license-decrement.js

# Using API endpoint
USE_API=true node scripts/daily-license-decrement.js
```

### 5. Set Up Cron Job

Add to your crontab (runs daily at midnight):

```bash
# Edit crontab
crontab -e

# Add this line (adjust paths as needed)
0 0 * * * cd /path/to/your/project && /usr/bin/node scripts/daily-license-decrement.js >> logs/license-cron.log 2>&1
```

#### Cron Schedule Examples

```bash
# Daily at midnight
0 0 * * * /path/to/script

# Daily at 2 AM
0 2 * * * /path/to/script

# Every hour (for testing)
0 * * * * /path/to/script

# Every 5 minutes (for testing)
*/5 * * * * /path/to/script
```

### 6. Create Log Directory

```bash
mkdir -p logs
touch logs/license-cron.log
```

### 7. Monitor Logs

```bash
# View recent logs
tail -f logs/license-cron.log

# View cron job status
grep CRON /var/log/syslog
```

## Script Modes

### API Mode (Recommended for Production)

```bash
USE_API=true node scripts/daily-license-decrement.js
```

- Uses the `/api/license/decrement` endpoint
- Goes through your application's middleware and validation
- Better error handling and logging
- Respects your application's database connection pooling

### Direct Database Mode

```bash
node scripts/daily-license-decrement.js
```

- Connects directly to MongoDB
- Faster execution
- Good for development or when API is not available
- Requires MongoDB connection string

## License Behavior

### License Values

- `-1` = Lifetime access (never decremented)
- `0` = Expired (no access)
- `> 0` = Days remaining (decremented daily)

### Access Rules

- **Lifetime (`-1`)**: Never expires, full access
- **Active (`> 7`)**: Full access, license decremented daily
- **Expiring Soon (`1-7`)**: Full access but warning shown, license decremented daily
- **Expired (`0`)**: No access, `isLicenseActive` set to `false`

### What Happens When License Expires

1. License value becomes `0`
2. `isLicenseActive` is set to `false`
3. `licenseExpiryDate` is set to current date
4. All admins of that client lose access to the application
5. API calls return 403 Forbidden with license expired message

## Monitoring and Alerts

### Script Output

The script provides detailed logging:

```
[2024-01-15T00:00:01.000Z] 🕒 Starting daily license decrement job...
[2024-01-15T00:00:01.100Z] 📊 Found 25 clients with active licenses
[2024-01-15T00:00:01.200Z] ✅ Client ABC Corp (507f1f77bcf86cd799439011) license decremented to 15 days
[2024-01-15T00:00:01.300Z] ⚠️ Client XYZ Ltd (507f1f77bcf86cd799439012) license expired
[2024-01-15T00:00:02.000Z] ✅ Daily license decrement job completed successfully!
[2024-01-15T00:00:02.001Z] 📊 Results: 25 processed, 3 expired, 22 still active, 0 errors
```

### Email Notifications (Optional)

You can extend the script to send email notifications:

```javascript
// Add to the script
const nodemailer = require('nodemailer');

async function sendExpiryNotifications(expiredClients, expiringSoonClients) {
    // Configure your email service
    const transporter = nodemailer.createTransporter({
        // Your email configuration
    });
    
    // Send notifications for expired clients
    for (const client of expiredClients) {
        await transporter.sendMail({
            to: client.clientEmail,
            subject: 'License Expired - Action Required',
            text: `Your license has expired. Please contact support to renew.`
        });
    }
    
    // Send warnings for expiring soon clients
    for (const client of expiringSoonClients) {
        await transporter.sendMail({
            to: client.clientEmail,
            subject: `License Expiring Soon - ${client.newLicense} days left`,
            text: `Your license expires in ${client.newLicense} days. Please renew to avoid service interruption.`
        });
    }
}
```

## Troubleshooting

### Common Issues

1. **Script not running**: Check cron service is running (`sudo service cron status`)
2. **Permission denied**: Make sure script is executable (`chmod +x`)
3. **Database connection failed**: Check MongoDB URI and network connectivity
4. **API calls failing**: Verify NEXT_PUBLIC_DOMAIN and ensure API is accessible

### Debug Mode

Run with debug output:

```bash
DEBUG=1 node scripts/daily-license-decrement.js
```

### Manual Testing

Test specific scenarios:

```bash
# Test API endpoint directly
curl -X POST http://localhost:3000/api/license/decrement

# Check license status
curl "http://localhost:3000/api/license?clientId=YOUR_CLIENT_ID"
```

## Security Considerations

1. **Secure the cron script**: Ensure only authorized users can modify it
2. **Database credentials**: Use environment variables, never hardcode
3. **API authentication**: Consider adding API key authentication for the decrement endpoint
4. **Logging**: Don't log sensitive information like passwords or tokens
5. **Backup**: Always backup your database before running license operations

## Backup and Recovery

Before implementing:

1. **Backup your database**
2. **Test on staging environment first**
3. **Have a rollback plan**
4. **Monitor the first few runs closely**

## Support

If you encounter issues:

1. Check the logs first
2. Verify environment variables
3. Test database connectivity
4. Run the script manually to see detailed output
5. Check cron service status and logs