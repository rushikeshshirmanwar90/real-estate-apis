/**
 * Backfill LoginUser rows for Clients and Admins that never got one.
 *
 * Why this is needed: POST /api/clients wrote `userType: "clients"`, which was
 * missing from the LoginUser enum, so the save threw after the Client had
 * already been written. POST /api/admin never created a LoginUser at all.
 * Either way the account exists but /api/findUser returns 404, so it can never
 * receive an OTP or set a password.
 *
 * Both routes are fixed now; this repairs the records created before the fix.
 *
 * Dry run (default, writes nothing):
 *   node scripts/backfill-missing-login-users.js
 * Apply:
 *   node scripts/backfill-missing-login-users.js --apply
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI / DB_URL not found in environment');
  process.exit(1);
}

const loginUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false, select: false },
  userType: {
    type: String,
    required: true,
    enum: ['admin', 'users', 'clients', 'staff', 'customer'],
  },
});

const run = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log(`✅ Connected${APPLY ? '' : '  (DRY RUN — pass --apply to write)'}\n`);

  const LoginUser = mongoose.models.LoginUser || mongoose.model('LoginUser', loginUserSchema);
  const db = mongoose.connection.db;

  const targets = [
    { label: 'Client', collection: 'clients', userType: 'clients' },
    { label: 'Admin', collection: 'admins', userType: 'admin' },
  ];

  let created = 0;
  let skipped = 0;

  for (const target of targets) {
    const records = await db
      .collection(target.collection)
      .find({}, { projection: { email: 1 } })
      .toArray();

    console.log(`── ${target.label}: ${records.length} record(s)`);

    for (const record of records) {
      if (!record.email) {
        console.log(`   ⚠️  ${record._id} has no email — skipping`);
        skipped += 1;
        continue;
      }

      const existing = await LoginUser.findOne({ email: record.email }).lean();
      if (existing) {
        skipped += 1;
        continue;
      }

      console.log(`   ➕ missing login for ${record.email} (${target.userType})`);
      if (APPLY) {
        await LoginUser.create({ email: record.email, userType: target.userType });
      }
      created += 1;
    }
  }

  console.log(
    `\n${APPLY ? '✅ Created' : '📝 Would create'} ${created} login user(s); ${skipped} already fine.`
  );
  console.log(
    'These accounts have no password yet, so /api/findUser returns 201 and the app sends an OTP — the normal verification flow.'
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('❌ Backfill failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
