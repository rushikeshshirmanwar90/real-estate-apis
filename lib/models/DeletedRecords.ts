import { model, models, Schema } from "mongoose";

/**
 * Archive for all hard-deleted records
 * Provides recovery mechanism and audit trail
 */
const DeletedRecordsSchema = new Schema(
  {
    // Original document data
    originalId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    
    modelName: {
      type: String,
      required: true,
      index: true,
      enum: [
        'Projects',
        'Building',
        'Section',
        'RowHouse',
        'RoomInfo',
        'OtherSection',
        'MiniSection',
        'MaterialActivity',
        'Activity',
        'Updates',
        'Equipment',
        'Labor',
        'Staff',
        'Admin',
        'UserCustomerDetails',
        'Client'
      ],
    },
    
    // Full document backup
    documentData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    
    // Deletion metadata
    deletedBy: {
      userId: {
        type: String,
        required: false,
      },
      userName: {
        type: String,
        required: false,
      },
      userRole: {
        type: String,
        required: false,
      },
    },
    
    deletedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    
    deletionReason: {
      type: String,
      required: false,
    },
    
    // Related records info (for cascade deletes)
    cascadeInfo: {
      parentModel: {
        type: String,
        required: false,
      },
      parentId: {
        type: Schema.Types.ObjectId,
        required: false,
      },
      deletedAsPartOfCascade: {
        type: Boolean,
        default: false,
      },
    },
    
    // Project/Client context for filtering
    projectId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    
    clientId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    
    // Recovery status
    recovered: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    recoveredAt: {
      type: Date,
      required: false,
    },
    
    recoveredBy: {
      userId: {
        type: String,
        required: false,
      },
      userName: {
        type: String,
        required: false,
      },
    },
    
    // Auto-purge after retention period
    purgeAfter: {
      type: Date,
      required: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
DeletedRecordsSchema.index({ modelName: 1, originalId: 1 });
DeletedRecordsSchema.index({ deletedAt: 1, recovered: 1 });
DeletedRecordsSchema.index({ projectId: 1, deletedAt: -1 });
DeletedRecordsSchema.index({ clientId: 1, deletedAt: -1 });
DeletedRecordsSchema.index({ purgeAfter: 1 }, { sparse: true });

const DeletedRecords = models.DeletedRecords || model("DeletedRecords", DeletedRecordsSchema);

export { DeletedRecords };
