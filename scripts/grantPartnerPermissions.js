/**
 * One-off backfill: give every staff member who is an active partner on an
 * active partnership all staff permissions. Partners added from now on get them
 * automatically (app/api/partnership/route.ts); this covers the ones added before.
 *
 * Existing permissions are kept; only missing ones are added.
 *
 *   node scripts/grantPartnerPermissions.js           # show what would change
 *   node scripts/grantPartnerPermissions.js --apply   # make the change
 */

require('dotenv').config();
const mongoose = require("mongoose");

// Keep in step with STAFF_PERMISSIONS in lib/models/users/Staff.ts
const STAFF_PERMISSIONS = [
  "addMaterial",
  "addMaterialUsage",
  "addOtherCost",
  "addEquipmentCost",
  "contractor",
  "generateReport",
];

const apply = process.argv.includes("--apply");

const run = async () => {
  await mongoose.connect(process.env.DB_URL, { dbName: "realEstate" });
  console.log("✅ Connected to database");

  const db = mongoose.connection.db;

  const partnerships = await db
    .collection("partnerships")
    .find({ status: "active" }, { projection: { partners: 1 } })
    .toArray();

  const partnerIds = new Set();
  for (const partnership of partnerships) {
    for (const partner of partnership.partners || []) {
      if (partner.partnerType === "staff" && partner.status === "active") {
        partnerIds.add(partner.partnerId);
      }
    }
  }

  const ids = [...partnerIds]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const missing = await db
    .collection("staffs")
    .find(
      { _id: { $in: ids }, permissions: { $not: { $all: STAFF_PERMISSIONS } } },
      { projection: { firstName: 1, lastName: 1, email: 1, permissions: 1 } }
    )
    .toArray();

  console.log(`Active staff partners: ${ids.length}`);
  console.log(`Missing at least one permission: ${missing.length}`);
  for (const staff of missing) {
    const lacking = STAFF_PERMISSIONS.filter((p) => !(staff.permissions || []).includes(p));
    console.log(`  - ${staff.firstName} ${staff.lastName} <${staff.email}>: ${lacking.join(", ")}`);
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to grant the permissions.");
  } else if (missing.length > 0) {
    const result = await db.collection("staffs").updateMany(
      { _id: { $in: missing.map((s) => s._id) } },
      { $addToSet: { permissions: { $each: STAFF_PERMISSIONS } } }
    );
    console.log(`\n✅ Updated ${result.modifiedCount} staff member(s)`);
    console.log("ℹ️  Clear the staff:* Redis keys (or wait for them to expire) so the admin Staff tab shows it.");
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("❌ Backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
