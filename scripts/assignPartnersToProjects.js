/**
 * One-off backfill: make every staff member who is an active partner on an
 * active partnership staff on that partnership's project, so the project shows
 * up in their app. Partners added from now on are assigned automatically
 * (app/api/partnership/route.ts); this covers the ones added before.
 *
 * Writes both sides, as lib/utils/staffProjectUtils.ts does: the project's
 * assignedStaff and the staff member's assignedProjects. Nothing is removed,
 * and anyone already assigned is left as they are.
 *
 *   node scripts/assignPartnersToProjects.js           # show what would change
 *   node scripts/assignPartnersToProjects.js --apply   # make the change
 */

require('dotenv').config();
const mongoose = require("mongoose");

const apply = process.argv.includes("--apply");

const run = async () => {
  await mongoose.connect(process.env.DB_URL, { dbName: "realEstate" });
  console.log("✅ Connected to database");

  const db = mongoose.connection.db;
  const { ObjectId } = mongoose.Types;

  const partnerships = await db
    .collection("partnerships")
    .find({ status: "active" }, { projection: { clientId: 1, projectId: 1, projectName: 1, partners: 1 } })
    .toArray();

  let addedToProject = 0;
  let addedToStaff = 0;

  for (const partnership of partnerships) {
    const projectId = partnership.projectId;
    const clientId = String(partnership.clientId);

    const project = await db
      .collection("projects")
      .findOne({ _id: projectId }, { projection: { name: 1, assignedStaff: 1 } });
    if (!project) {
      console.log(`⚠️  Partnership ${partnership._id}: project ${projectId} not found, skipped`);
      continue;
    }

    const client = await db.collection("clients").findOne({ _id: partnership.clientId }, { projection: { name: 1 } });
    const clientName = client?.name || "Business";
    const projectName = project.name || partnership.projectName;

    const staffPartners = (partnership.partners || []).filter(
      (p) => p.partnerType === "staff" && p.status === "active" && ObjectId.isValid(p.partnerId)
    );

    for (const partner of staffPartners) {
      const staff = await db
        .collection("staffs")
        .findOne(
          { _id: new ObjectId(partner.partnerId) },
          { projection: { firstName: 1, lastName: 1, clients: 1, assignedProjects: 1 } }
        );
      const label = `${partner.name} → ${projectName}`;
      if (!staff) {
        console.log(`⚠️  ${label}: staff record not found, skipped`);
        continue;
      }
      // Same rule as the route: only people still on the business's team
      if (!(staff.clients || []).some((c) => String(c.clientId) === clientId)) {
        console.log(`⚠️  ${label}: no longer on this business's team, skipped`);
        continue;
      }

      const staffId = String(staff._id);
      const onProject = (project.assignedStaff || []).some((s) => String(s._id) === staffId);
      const hasProject = (staff.assignedProjects || []).some((p) => String(p.projectId) === String(projectId));
      if (onProject && hasProject) continue;

      console.log(
        `  - ${label}: ${[!onProject && "add to project's staff", !hasProject && "add project to staff record"]
          .filter(Boolean)
          .join(", ")}`
      );
      if (!apply) continue;

      if (!onProject) {
        // Project's assignedStaff._id is a String in the schema
        const result = await db.collection("projects").updateOne(
          { _id: projectId, "assignedStaff._id": { $ne: staffId } },
          {
            $push: {
              assignedStaff: {
                _id: staffId,
                fullName: `${staff.firstName} ${staff.lastName}`,
                monthlyPayment: 0,
              },
            },
          }
        );
        addedToProject += result.modifiedCount;
      }
      if (!hasProject) {
        const result = await db.collection("staffs").updateOne(
          { _id: staff._id, "assignedProjects.projectId": { $ne: projectId } },
          {
            $push: {
              assignedProjects: {
                projectId,
                projectName,
                clientId: new ObjectId(clientId),
                clientName,
                assignedAt: new Date(),
                status: "active",
                monthlyPayment: 0,
              },
            },
          }
        );
        addedToStaff += result.modifiedCount;
      }
    }
  }

  console.log(`\nActive partnerships checked: ${partnerships.length}`);
  if (!apply) {
    console.log("Dry run. Re-run with --apply to assign the partners.");
  } else {
    console.log(`✅ Added ${addedToProject} partner(s) to project staff lists`);
    console.log(`✅ Added the project to ${addedToStaff} staff record(s)`);
    console.log("ℹ️  Clear the staff:* and project:* Redis keys (or wait for them to expire) so the admin screens show it.");
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("❌ Backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
