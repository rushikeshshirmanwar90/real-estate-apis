# Quick Reference - Shivai APIs Migration

## ✅ Status: COMPLETE

All APIs and models required by Shivai mobile app are now in the clone directory.

---

## What Was Done

### 3 Models Fixed
1. **Customer** - Added myFlats, bookings, qrCodeData
2. **Building** - Added customerId, pricing fields, clientId
3. **LoginUser** - Added "customer" to userType enum

### 3 Models Added
1. **Booking** - Booking records
2. **Registry** - Registration details
3. **PaymentSchedule** - Payment schedules

### 6 APIs Added
1. **customer/register** - Registration & retrieval
2. **customer/login** - Authentication
3. **customer/assign-property** - Property assignment
4. **customer/my-flats** - Get customer flats
5. **qr-decode** - QR code decoder
6. **setup-client** - Client setup

---

## Quick Start

### 1. Install Dependencies
```bash
cd clone/real-estate-apis
npm install jimp jsqr  # If not already installed
```

### 2. Start Server
```bash
npm run dev
```

### 3. Test Setup
```bash
# Create client document
curl -X POST http://localhost:8080/api/setup-client

# Test customer registration
curl -X POST http://localhost:8080/api/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "mobileNumber": "9876543210",
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

### 4. Update Shivai App
```typescript
// Shivai/lib/domain.ts
export const domain = "http://YOUR_CLONE_SERVER_IP:8080/";
```

---

## All APIs (15 Total)

### Authentication (5)
- ✅ `/api/login` - POST
- ✅ `/api/findUser` - POST
- ✅ `/api/otp` - POST
- ✅ `/api/password` - POST
- ✅ `/api/forget-password` - POST

### Client & Project (4)
- ✅ `/api/clients` - GET
- ✅ `/api/project` - GET
- ✅ `/api/building` - GET
- ✅ `/api/units` - PUT

### Customer (4)
- ✅ `/api/customer/register` - GET, POST
- ✅ `/api/customer/login` - POST
- ✅ `/api/customer/assign-property` - GET, POST
- ✅ `/api/customer/my-flats` - GET

### Utility (2)
- ✅ `/api/qr-decode` - POST
- ✅ `/api/setup-client` - GET, POST

---

## Documentation Files

1. **SHIVAI_APIS_MIGRATION_COMPLETE.md** - Migration overview
2. **MODEL_VERIFICATION_COMPLETE.md** - Model changes
3. **CHANGES_SUMMARY.md** - Detailed changes
4. **FINAL_VERIFICATION_CHECKLIST.md** - Testing checklist
5. **API_VERIFICATION_COMPLETE.md** - API verification
6. **COMPLETE_VERIFICATION_SUMMARY.md** - Complete summary
7. **QUICK_REFERENCE.md** - This file

---

## Common Issues

### "Client not found"
```bash
curl -X POST http://localhost:8080/api/setup-client
```

### "Package not found: jimp or jsqr"
```bash
npm install jimp jsqr
```

### "Invalid password format"
Password must have:
- 8+ characters
- 1 uppercase letter
- 1 lowercase letter
- 1 number
- 1 special character (@$!%*?&)

---

## Key Changes

### Customer Model
```typescript
// Added:
myFlats: [{ buildingId, floorId, unitId, unitNumber, assignedAt, bookingId }]
bookings: [ObjectId]
qrCodeData: String
```

### Building Model
```typescript
// Added to customerInfo:
customerId: String
originalPrice: Number
discountPrice: Number
finalPrice: Number
assignedBy: String

// Added to schema:
clientId: ObjectId
```

### LoginUser Model
```typescript
// Updated enum:
userType: ["admin", "users", "staff", "customer"]
```

---

## Testing Flow

1. **Register Customer** → POST /api/customer/register
2. **Login Customer** → POST /api/customer/login
3. **Admin Scans QR** → POST /api/qr-decode
4. **Get Customer** → GET /api/customer/register?customerId=X
5. **Get Projects** → GET /api/project?clientId=X
6. **Get Building** → GET /api/building?id=X
7. **Assign Property** → POST /api/customer/assign-property
8. **View Flats** → GET /api/customer/my-flats?customerId=X

---

## Status: ✅ READY

Everything is verified and ready for use!
