import mongoose, { Schema, Document } from "mongoose";

export interface IPushToken extends Document {
  userId: string;
  clientId: string;
  role: "admin" | "staff";
  token: string;
  updatedAt: Date;
}

const PushTokenSchema = new Schema<IPushToken>({
  userId: { type: String, required: true },
  clientId: { type: String, required: true },
  role: { type: String, enum: ["admin", "staff"], required: true },
  token: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

// One token per user (latest token always wins)
PushTokenSchema.index({ userId: 1 }, { unique: true });

// Fast fan-out lookup by clientId and role
PushTokenSchema.index({ clientId: 1, role: 1 });

// Index for token validation
PushTokenSchema.index({ token: 1 });

export const PushToken =
  mongoose.models.PushToken || mongoose.model<IPushToken>("PushToken", PushTokenSchema);
