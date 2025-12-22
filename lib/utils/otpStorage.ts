// Shared OTP storage for the application
// In production, this should be replaced with Redis or database storage

export interface OTPData {
  hash: string;
  expiresAt: number;
  attempts: number;
}

// Global in-memory storage (will persist across API calls in the same process)
const otpStorage = new Map<string, OTPData>();

export const getOTPStorage = () => otpStorage;

export const storeOTP = (email: string, otpData: OTPData): void => {
  const key = email.toLowerCase();
  otpStorage.set(key, otpData);
  console.log('💾 Stored OTP for:', key, 'Total stored:', otpStorage.size);
};

export const getOTP = (email: string): OTPData | undefined => {
  const key = email.toLowerCase();
  const data = otpStorage.get(key);
  console.log('🔍 Looking for OTP:', key, 'Found:', !!data, 'Total stored:', otpStorage.size);
  return data;
};

export const updateOTP = (email: string, otpData: OTPData): void => {
  const key = email.toLowerCase();
  otpStorage.set(key, otpData);
  console.log('🔄 Updated OTP for:', key);
};

export const deleteOTP = (email: string): boolean => {
  const key = email.toLowerCase();
  const deleted = otpStorage.delete(key);
  console.log('🗑️ Deleted OTP for:', key, 'Success:', deleted, 'Remaining:', otpStorage.size);
  return deleted;
};

export const clearExpiredOTPs = (): void => {
  const now = Date.now();
  let cleared = 0;
  
  for (const [email, data] of otpStorage.entries()) {
    if (now > data.expiresAt) {
      otpStorage.delete(email);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    console.log('🧹 Cleared', cleared, 'expired OTPs');
  }
};

// Clean up expired OTPs every 5 minutes
setInterval(clearExpiredOTPs, 5 * 60 * 1000);