import crypto from "crypto";

export interface OTPData {
  hash: string;
  expiresAt: number;
  attempts: number;
}

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const hashOTP = (otp: string): string => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

export const verifyOTP = (
  inputOTP: string,
  storedHash: string,
  expiresAt: number,
  attempts: number
): { valid: boolean; reason?: string } => {
  // Check attempts
  if (attempts >= MAX_ATTEMPTS) {
    return { valid: false, reason: "Maximum attempts exceeded" };
  }

  // Check expiry
  if (Date.now() > expiresAt) {
    return { valid: false, reason: "OTP expired" };
  }

  // Verify hash
  const inputHash = hashOTP(inputOTP);
  if (inputHash !== storedHash) {
    return { valid: false, reason: "Invalid OTP" };
  }

  return { valid: true };
};

export const createOTPData = (otp: string): OTPData => {
  return {
    hash: hashOTP(otp),
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
  };
};
