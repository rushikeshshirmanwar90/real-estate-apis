import mongoose, { Schema, Document } from "mongoose";

export interface IPushToken extends Document {
  userId: string;
  clientId?: string; // Optional - will be populated from user data
  userType: "admin" | "staff" | "client";
  token: string;
  platform: "ios" | "android" | "web";
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  isActive: boolean;
  lastUsed: Date;
  updatedAt: Date;
  createdAt: Date;
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    userId: { type: String, required: true },
    clientId: { type: String, required: false }, // Optional - populated from user lookup
    userType: { 
      type: String, 
      enum: ["admin", "staff", "client"], 
      required: true 
    },
    token: { type: String, required: true },
    platform: { 
      type: String, 
      enum: ["ios", "android", "web"], 
      required: true 
    },
    deviceId: { type: String, required: false },
    deviceName: { type: String, required: false },
    appVersion: { type: String, required: false },
    isActive: { type: Boolean, default: true },
    lastUsed: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// One token per user (latest token always wins)
PushTokenSchema.index({ userId: 1 }, { unique: true });

// Fast fan-out lookup by clientId and userType
PushTokenSchema.index({ clientId: 1, userType: 1 });

// Index for token validation
PushTokenSchema.index({ token: 1 });

// Index for platform-specific queries
PushTokenSchema.index({ platform: 1 });

// Index for active token queries
PushTokenSchema.index({ isActive: 1 });

// Compound index for efficient admin notification broadcasting
PushTokenSchema.index({ clientId: 1, userType: 1, isActive: 1 });

export const PushToken =
  mongoose.models.PushToken || mongoose.model<IPushToken>("PushToken", PushTokenSchema);
