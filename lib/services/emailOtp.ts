import crypto from "crypto";
import { render } from "@react-email/components";
import connect from "@/lib/db";
import { OTP } from "@/lib/models/OTP";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { transporter } from "@/lib/transporter";
import { EmailTemplate } from "@/components/mail/EmailTemplate";
import { generateOTP, hashOTP } from "@/lib/utils/otp";
import { logger } from "@/lib/utils/logger";
import { signResetToken } from "@/lib/auth/session";

// The server creates, emails, stores (hashed) and checks every OTP.
// The app never sees the code except in the user's inbox.

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_WAIT_MS = 60 * 1000; // one code per minute per email
export const MAX_OTP_ATTEMPTS = 5;

export type OtpResult =
  | { ok: true; resetToken?: string }
  | { ok: false; status: number; message: string };

export const normalizeEmail = (email: unknown): string =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

/** Creates a code for an existing account, stores its hash, and emails it. */
export const sendEmailOtp = async (rawEmail: unknown): Promise<OtpResult> => {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, status: 400, message: "Email is required" };

  await connect();

  const account = await LoginUser.findOne({ email }).select("_id").lean();
  if (!account) {
    return { ok: false, status: 404, message: "User not found with this email address" };
  }

  const existing = (await OTP.findOne({ email }).lean()) as any;
  if (existing?.createdAt && Date.now() - new Date(existing.createdAt).getTime() < RESEND_WAIT_MS) {
    return { ok: false, status: 429, message: "Please wait a minute before requesting another code" };
  }

  const code = generateOTP();
  await OTP.findOneAndUpdate(
    { email },
    {
      email,
      hash: hashOTP(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      createdAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    const html = await render(EmailTemplate({ verificationCode: Number(code) }));
    await transporter.sendMail({
      from: `"Exponentor" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Email Verification Code",
      html,
    });
  } catch (error) {
    // Let the user ask again right away if the email never went out
    await OTP.deleteOne({ email });
    logger.error("Failed to send OTP email", { email, error: String(error) });
    return { ok: false, status: 500, message: "Failed to send the code. Please try again." };
  }

  logger.info("OTP sent", { email });
  return { ok: true };
};

/** Checks a code. On success the code is used up and a 15-minute reset token is returned. */
export const verifyEmailOtp = async (rawEmail: unknown, rawCode: unknown): Promise<OtpResult> => {
  const email = normalizeEmail(rawEmail);
  const code = typeof rawCode === "number" ? String(rawCode) : typeof rawCode === "string" ? rawCode.trim() : "";
  if (!email || !/^\d{6}$/.test(code)) {
    return { ok: false, status: 400, message: "Email and a 6-digit code are required" };
  }

  await connect();

  const record = (await OTP.findOne({ email }).lean()) as any;
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
    return { ok: false, status: 400, message: "Code expired. Please request a new one." };
  }
  if ((record.attempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    await OTP.deleteOne({ email });
    return { ok: false, status: 429, message: "Too many wrong attempts. Please request a new code." };
  }

  const given = Buffer.from(hashOTP(code), "hex");
  const stored = Buffer.from(String(record.hash), "hex");
  const matches = given.length === stored.length && crypto.timingSafeEqual(given, stored);

  if (!matches) {
    const attempts = (record.attempts ?? 0) + 1;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteOne({ email });
      return { ok: false, status: 429, message: "Too many wrong attempts. Please request a new code." };
    }
    await OTP.updateOne({ email }, { $inc: { attempts: 1 } });
    return {
      ok: false,
      status: 400,
      message: `Incorrect code. ${MAX_OTP_ATTEMPTS - attempts} attempts left.`,
    };
  }

  await OTP.deleteOne({ email });
  return { ok: true, resetToken: signResetToken(email) };
};
