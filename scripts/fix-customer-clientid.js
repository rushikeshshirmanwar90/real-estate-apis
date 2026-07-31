/**
 * Re-tag Shivai app customers (and their synced phone books) to a real client.
 *
 * Why this exists: /api/customer/register used to hardcode
 * clientId = "69600d70cd1b223a43790497" for every self-registered customer.
 * No Client document with that _id was ever created, so those customers — and
 * the CustomerContacts documents that copy their clientId — are invisible to
 * the admin panel, which scopes every query to the logged-in admin's clientId.
 *
 * Usage (dry run first — this only reports, it changes nothing):
 *   node scripts/fix-customer-clientid.js <targetClientId>
 *
 * Then apply:
 *   node scripts/fix-customer-clientid.js <targetClientId> --apply
 *
 * By default it moves customers away from the orphaned client above. Pass
 * --from=<clientId> to move a different one.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URL;

// The placeholder client id that was hardcoded in the register route.
const ORPHANED_CLIENT_ID = '69600d70cd1b223a43790497';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const fromArg = args.find((a) => a.startsWith('--from='));
const fromClientId = fromArg ? fromArg.split('=')[1] : ORPHANED_CLIENT_ID;
const targetClientId = args.find((a) => !a.startsWith('--'));

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI / DB_URL not found in environment');
  process.exit(1);
}

if (!targetClientId || !mongoose.Types.ObjectId.isValid(targetClientId)) {
  console.error('❌ Usage: node scripts/fix-customer-clientid.js <targetClientId> [--from=<clientId>] [--apply]');
  process.exit(1);
}

if (!mongoose.Types.ObjectId.isValid(fromClientId)) {
  console.error(`❌ --from is not a valid ObjectId: ${fromClientId}`);
  process.exit(1);
}

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;
  const clients = db.collection('clients');
  const customers = db.collection('customers');
  const contacts = db.collection('customercontacts');

  const from = new mongoose.Types.ObjectId(fromClientId);
  const to = new mongoose.Types.ObjectId(targetClientId);

  // Refuse to move customers onto a client that doesn't exist — that is exactly
  // the bug we're repairing.
  const target = await clients.findOne({ _id: to });
  if (!target) {
    console.error(`❌ No client document with _id ${targetClientId}. Aborting.`);
    console.error('   Available clients:');
    const all = await clients.find({}, { projection: { name: 1, email: 1 } }).toArray();
    all.forEach((c) => console.error(`     ${c._id}  ${c.name || ''}  ${c.email || ''}`));
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`🎯 Target client: ${target.name || '(unnamed)'} <${target.email || 'no email'}> (${to})`);
  console.log(`📦 Moving everything currently tagged ${from}\n`);

  // clientId is stored as an ObjectId, but earlier writes may have left strings
  // behind — match both so nothing is missed.
  const match = { clientId: { $in: [from, fromClientId] } };

  const customerCount = await customers.countDocuments(match);
  const contactDocs = await contacts.find(match).toArray();
  const contactEntryCount = contactDocs.reduce((n, d) => n + (d.contactCount || 0), 0);

  console.log(`   customers        : ${customerCount}`);
  console.log(`   contact records  : ${contactDocs.length} (${contactEntryCount} contact entries)\n`);

  contactDocs.forEach((d) => {
    console.log(`     • ${d.customerName || '(no name)'} ${d.customerMobile || ''} — ${d.contactCount || 0} contacts`);
  });
  console.log('');

  if (!apply) {
    console.log('🧪 Dry run — nothing was changed. Re-run with --apply to write.');
    await mongoose.disconnect();
    return;
  }

  const customerResult = await customers.updateMany(match, { $set: { clientId: to } });
  const contactResult = await contacts.updateMany(match, { $set: { clientId: to } });

  console.log(`✅ customers updated       : ${customerResult.modifiedCount}`);
  console.log(`✅ contact records updated : ${contactResult.modifiedCount}`);
  console.log('\n👉 Now set SHIVAI_DEFAULT_CLIENT_ID=' + targetClientId + ' in the backend .env so new sign-ups land on the right client.');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('❌ Failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
