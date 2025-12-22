import mongoose, { Schema, Document } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  hash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const OTPSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  hash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one OTP per email at a time
OTPSchema.index({ email: 1 }, { unique: true });

export const OTP = mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema);