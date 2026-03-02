# License Management System

This system provides automatic license management for clients with daily decrementation functionality.

## Features

1. **License Days Management**: Set license duration in days when creating/updating clients
2. **Automatic Expiry Calculation**: System calculates expiry date based on license days
3. **Daily Decrementation**: Automatic daily reduction of license days via cron job
4. **License Status Tracking**: Monitor active, expired, and remaining license days
5. **Admin Dashboard**: View and manage all client licenses from one place

## How It Works

### 1. Client Model Updates
- Added `licenseExpiryDate`: Stores the calculated expiry date
- Added `isLicenseActive`: Boolean flag for license status
- Modified `license`: Now stores remaining days

### 2. Client Form Integration
- Added "License Days" field in the client form
- When creating/updating a client, you can specify the number of license days
- System automatically calculates and sets the expiry date

### 3. API Endpoints

#### Client Management (`/api/clients`)
- **POST**: Create client with license days
- **PUT**: Update client license days
- **GET**: Retrieve client with license information

#### License Management (`/api/license`)
- **PUT**: Update specific client license
- **GET**: Get license status for a client
- **POST**: Manual license decrementation (used by cron)

#### Cron Job (`/api/cron/license-update`)
- **POST**: Daily license update (decrements all active licenses)
- Requires authorization header: `Bearer your-secret-key`

#### Scheduler Control (`/api/license-scheduler`)
- **GET**: Check scheduler status
- **POST**: Control scheduler (start/stop/trigger)

### 4. Daily License Update Process

The system runs a daily cron job that:
1. Finds all clients with active licenses
2. Calculates remaining days based on expiry date
3. Updates the `license` field with remaining days
4. Sets `isLicenseActive` to false for expired licenses
5. Logs all updates for monitoring

## Usage Instructions

### Adding License to New Client
1. Go to Super Admin → Add Client
2. Fill in client details
3. Set "License Days" (e.g., 30 for 30 days)
4. Submit the form
5. System automatically sets expiry date and activates license

### Updating Existing Client License
1. Go to Super Admin → Clients → Edit Client
2. Update "License Days" field
3. Submit the form
4. System recalculates expiry date from current date

### Monitoring Licenses
1. Go to Super Admin → License Management
2. View dashboard with:
   - Total clients
   - Active licenses
   - Expired licenses
   - Scheduler status
3. See detailed table with all client license information

### Manual License Update
1. Go to License Management page
2. Click "Manual Update" button
3. System immediately processes all licenses

### Scheduler Management
- **Start Scheduler**: Begin automatic daily updates
- **Stop Scheduler**: Pause automatic updates
- **Manual Update**: Trigger immediate license update

## Environment Variables

Add to your `.env` file:
```
CRON_SECRET=your-secret-key-here
NEXT_PUBLIC_DOMAIN=http://localhost:3000
```

## Cron Job Setup (Production)

For production deployment, set up a cron job to call the license update endpoint daily:

```bash
# Add to crontab (runs daily at midnight)
0 0 * * * curl -X POST -H "Authorization: Bearer your-secret-key" https://yourdomain.com/api/cron/license-update
```

Or use a service like Vercel Cron, GitHub Actions, or similar scheduling services.

## API Examples

### Create Client with License
```javascript
const response = await fetch('/api/clients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phoneNumber: '1234567890',
    city: 'New York',
    state: 'NY',
    address: '123 Main St',
    licenseDays: 30 // 30 days license
  })
});
```

### Check License Status
```javascript
const response = await fetch('/api/license?clientId=CLIENT_ID');
const licenseInfo = await response.json();
```

### Manual License Update
```javascript
const response = await fetch('/api/license-scheduler', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'trigger' })
});
```

## License Status Indicators

- **Green**: License active with more than 7 days remaining
- **Orange**: License active but expires within 7 days
- **Red**: License expired
- **Gray**: No license set

## Troubleshooting

1. **Scheduler not running**: Check License Management page and start scheduler
2. **Licenses not updating**: Verify cron job is set up correctly
3. **Permission errors**: Check CRON_SECRET environment variable
4. **Date calculation issues**: Ensure server timezone is configured properly

## Security Notes

- Cron endpoint requires authorization header
- License updates are logged for audit trail
- Failed updates are caught and logged without stopping the process
- Scheduler can be controlled only through admin interface