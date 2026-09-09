import { NextRequest } from "next/server";
import connect from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logger";
import { PaymentCommitment } from "@/lib/models/Xsite/PaymentCommitment";
import {
  sendCommitmentReminder,
  sendCommitmentOverdue,
} from "@/lib/services/paymentCommitmentNotifier";

// Payments are tracked in IST; comparing calendar dates in that zone keeps
// "2 days before" and "overdue" stable regardless of the server's own TZ
// (Vercel functions run in UTC).
const TIME_ZONE = "Asia/Kolkata";

const toDateOnlyUTC = (date: Date): number => {
  const dateOnly = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return Date.parse(`${dateOnly}T00:00:00Z`);
};

const daysUntil = (commitmentDate: Date, now: Date): number =>
  Math.round((toDateOnlyUTC(commitmentDate) - toDateOnlyUTC(now)) / 86_400_000);

const runCheck = async () => {
  await connect();

  const now = new Date();
  const commitments = await PaymentCommitment.find({
    status: { $in: ["pending", "reminded"] },
  });

  let remindersSent = 0;
  let overdueSent = 0;
  const errors: { commitmentId: string; error: string }[] = [];

  for (const commitment of commitments) {
    try {
      const days = daysUntil(commitment.commitmentDate, now);

      // Overdue takes priority — a commitment that's both 2-days-out and
      // somehow already past (clock skew, backfilled date) should just be
      // treated as overdue, not double-notified.
      if (days <= 0 && !commitment.overdueNotifiedAt) {
        commitment.status = "overdue";
        commitment.overdueNotifiedAt = now;
        await commitment.save();
        await sendCommitmentOverdue(commitment.toObject());
        overdueSent++;
        continue;
      }

      if (days === 2 && !commitment.reminderSentAt) {
        commitment.status = "reminded";
        commitment.reminderSentAt = now;
        await commitment.save();
        await sendCommitmentReminder(commitment.toObject());
        remindersSent++;
      }
    } catch (error) {
      logger.error(`payment-commitment-check: failed for ${commitment._id}:`, error);
      errors.push({
        commitmentId: String(commitment._id),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const summary = {
    scanned: commitments.length,
    remindersSent,
    overdueSent,
    errors,
    timestamp: now.toISOString(),
  };
  logger.info(
    `payment-commitment-check completed: scanned ${commitments.length}, ${remindersSent} reminders, ${overdueSent} overdue, ${errors.length} errors`
  );
  return summary;
};

// Vercel Cron triggers scheduled routes with a GET request, sending
// `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET is set.
// POST is also exposed (same auth) for manual/external triggering — the
// existing push-token/maintenance/schedule route is POST-only and gated by
// checkValidClient's bearer token, which Vercel's scheduler never sends, so
// it can never actually fire from vercel.json; this route avoids that bug.
const authorize = (req: NextRequest): boolean => {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
};

export const GET = async (req: NextRequest) => {
  if (!authorize(req)) return errorResponse("Unauthorized", 401);
  try {
    const summary = await runCheck();
    return successResponse(summary, "Payment commitment check completed");
  } catch (error) {
    logger.error("payment-commitment-check cron error:", error);
    return errorResponse("Internal server error during commitment check", 500, error);
  }
};

export const POST = GET;
