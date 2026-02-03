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

  // Enhanced fields for robust token management
  lastValidated: {
    type: Date,
    default: Date.now,
  },

  validationScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  validationErrors: [{
    error: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],

  healthMetrics: {
    lastHealthCheck: {
      type: Date,
      default: Date.now,
    },
    validationScore: {
      type: Number,
      default: 0,
    },
    isHealthy: {
      type: Boolean,
      default: true,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastFailure: Date,
  },

  tokenMetadata: {
    format: {
      type: String,
      enum: ['EXPO', 'FCM', 'APNS', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    isLegacy: {
      type: Boolean,
      default: false,
    },
    tokenType: String,
  },

  // Deactivation tracking
  deactivationReason: String,
  deactivatedAt: Date,
}, {
  timestamps: true,
});

// Enhanced compound indexes for efficient queries
PushTokenSchema.index({ userId: 1, isActive: 1 });
PushTokenSchema.index({ token: 1, isActive: 1 });
PushTokenSchema.index({ isActive: 1, lastUsed: 1 });
PushTokenSchema.index({ isActive: 1, validationScore: 1 });
PushTokenSchema.index({ userId: 1, platform: 1, isActive: 1 });
PushTokenSchema.index({ 'healthMetrics.isHealthy': 1, isActive: 1 });

// Update lastUsed when token is accessed
PushTokenSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

// Enhanced deactivate method with reason tracking
PushTokenSchema.methods.deactivate = function(reason?: string) {
  this.isActive = false;
  this.deactivatedAt = new Date();
  if (reason) {
    this.deactivationReason = reason;
  }
  return this.save();
};

// Update health metrics
PushTokenSchema.methods.updateHealthMetrics = function(score: number, isHealthy: boolean) {
  this.healthMetrics.lastHealthCheck = new Date();
  this.healthMetrics.validationScore = score;
  this.healthMetrics.isHealthy = isHealthy;
  this.validationScore = score;
  return this.save();
};

// Record validation error
PushTokenSchema.methods.recordValidationError = function(error: string) {
  this.validationErrors.push({
    error,
    timestamp: new Date(),
  });
  
  // Increment failure count
  this.healthMetrics.failureCount = (this.healthMetrics.failureCount || 0) + 1;
  this.healthMetrics.lastFailure = new Date();
  
  // Auto-deactivate if too many failures
  if (this.healthMetrics.failureCount >= 5) {
    this.deactivate(`Too many validation failures: ${this.healthMetrics.failureCount}`);
  }
  
  return this.save();
};

// Static method to find healthy tokens for users
PushTokenSchema.statics.findHealthyTokensForUsers = function(userIds: string[]) {
  return this.find({
    userId: { $in: userIds },
    isActive: true,
    'healthMetrics.isHealthy': true,
    validationScore: { $gte: 50 },
  });
};

// Static method to find tokens needing cleanup
PushTokenSchema.statics.findTokensNeedingCleanup = function(maxAgeInDays: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
  
  return this.find({
    $or: [
      { isActive: false, updatedAt: { $lt: cutoffDate } },
      { lastUsed: { $lt: cutoffDate } },
      { 'healthMetrics.isHealthy': false, 'healthMetrics.failureCount': { $gte: 3 } },
    ]
  });
};

export const PushToken = models.PushToken || model("PushToken", PushTokenSchema);