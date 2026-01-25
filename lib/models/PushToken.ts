import { model, models, Schema } from "mongoose";

const PushTokenSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  
  userType: {
    type: String,
    required: true,
    enum: ['client', 'staff', 'admin'],
    default: 'client',
  },
  
  token: {
    type: String,
    required: true,
    unique: true,
  },
  
  platform: {
    type: String,
    required: true,
    enum: ['ios', 'android', 'web'],
  },
  
  deviceId: {
    type: String,
    required: false,
  },
  
  deviceName: {
    type: String,
    required: false,
  },
  
  appVersion: {
    type: String,
    required: false,
  },
  
  isActive: {
    type: Boolean,
    default: true,
  },
  
  lastUsed: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
PushTokenSchema.index({ userId: 1, isActive: 1 });
PushTokenSchema.index({ token: 1, isActive: 1 });

// Update lastUsed when token is accessed
PushTokenSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

// Deactivate token
PushTokenSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

export const PushToken = models.PushToken || model("PushToken", PushTokenSchema);