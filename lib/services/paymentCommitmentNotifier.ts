import { render } from "@react-email/components";
import connect from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { transporter } from "@/lib/transporter";
import { PaymentCommitmentEmail } from "@/components/mail/PaymentCommitmentEmail";
import {
  resolveRecipientsFromDB,
  sendNotificationsToRecipients,
} from "@/lib/utils/notificationSender";
import { PaymentCommitmentDoc } from "@/lib/models/Xsite/PaymentCommitment";
import { logger } from "@/lib/utils/logger";

const formatAmount = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * Sends both the push notification and the email for one commitment event.
 * Recipients are always "admins of this client" — resolved via the existing
 * resolveRecipientsFromDB, which already handles the admin push-token /
 * Client._id keying quirk. Called only from the daily cron; the
 * payment-recording routes resolve commitments silently.
 */
const notify = async (
  commitment: PaymentCommitmentDoc,
  kind: "reminder" | "overdue"
): Promise<void> => {
  await connect();

  const clientId = String(commitment.clientId);
  const commitmentDateLabel = formatDate(commitment.commitmentDate);
  const who = commitment.vendorName
    ? `${commitment.entityLabel} (${commitment.vendorName})`
    : commitment.entityLabel;

  const title =
    kind === "overdue" ? "Payment overdue — action needed" : "Payment due in 2 days";
  const body =
    kind === "overdue"
      ? `${formatAmount(commitment.amountDue)} to ${who} was due ${commitmentDateLabel} and is still unpaid. Tap to set a new date.`
      : `${formatAmount(commitment.amountDue)} owed to ${who} for ${commitment.projectName} is due on ${commitmentDateLabel}.`;

  // ── Push ────────────────────────────────────────────────────────────────
  try {
    const recipients = await resolveRecipientsFromDB(clientId);
    if (recipients.length === 0) {
      logger.info(`No admin push tokens for client ${clientId} — skipping push`);
    } else {
      await sendNotificationsToRecipients({
        title,
        body,
        category: "payment_commitment",
        action: kind,
        data: {
          category: "payment_commitment",
          action: kind,
          entityType: commitment.entityType,
          entityId: String(commitment.entityId),
          commitmentId: String(commitment._id),
          projectId: String(commitment.projectId),
          clientId,
          projectName: commitment.projectName,
          entityLabel: commitment.entityLabel,
          amountDue: commitment.amountDue,
        },
        recipients,
      });
    }
  } catch (error) {
    logger.error(`Failed to send commitment push for ${commitment._id}:`, error);
  }

  // ── Email ───────────────────────────────────────────────────────────────
  try {
    const client = await Client.findById(clientId).select("email name");
    if (!client?.email) {
      logger.info(`No email on file for client ${clientId} — skipping mail`);
      return;
    }

    const html = await render(
      PaymentCommitmentEmail({
        type: kind,
        projectName: commitment.projectName,
        entityLabel: commitment.entityLabel,
        vendorName: commitment.vendorName,
        amountDue: commitment.amountDue,
        commitmentDateLabel,
      })
    );

    await transporter.sendMail({
      from: `"Xsite" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: title,
      html,
    });
  } catch (error) {
    logger.error(`Failed to send commitment email for ${commitment._id}:`, error);
  }
};

export const sendCommitmentReminder = (commitment: PaymentCommitmentDoc) =>
  notify(commitment, "reminder");

export const sendCommitmentOverdue = (commitment: PaymentCommitmentDoc) =>
  notify(commitment, "overdue");
