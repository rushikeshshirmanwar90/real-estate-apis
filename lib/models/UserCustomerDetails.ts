import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for Property
export interface IProperty {
  _id?: string;
  id: string;
  projectId: string;
  projectName: string;
  sectionId: string;
  sectionName: string;
  sectionType: string;
  flatId: string;
  flatName: string;
  payments?: any[];
}

// Interface for User Customer Details (for property assignments)
export interface IUserCustomerDetails extends Document {
  userId: mongoose.Types.ObjectId;
  property: IProperty[];
  createdAt: Date;
  updatedAt: Date;
}

// User Customer Details Schema
const UserCustomerDetailsSchema = new Schema<IUserCustomerDetails>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  property: [{
    id: {
      type: String,
      required: true
    },
    projectId: {
      type: String,
      required: true
    },
    projectName: {
      type: String,
      required: true
    },
    sectionId: {
      type: String,
      required: true
    },
    sectionName: {
      type: String,
      required: true
    },
    sectionType: {
      type: String,
      required: true
    },
    flatId: {
      type: String,
      required: true
    },
    flatName: {
      type: String,
      required: true
    },
    payments: [{
      type: Schema.Types.Mixed,
      default: []
    }]
  }]
}, {
  timestamps: true,
  collection: 'userCustomerDetails'
});

// Indexes for better performance
UserCustomerDetailsSchema.index({ userId: 1 });
UserCustomerDetailsSchema.index({ createdAt: -1 });

// Create and export model
export const UserCustomerDetails: Model<IUserCustomerDetails> = mongoose.models.UserCustomerDetails || mongoose.model<IUserCustomerDetails>('UserCustomerDetails', UserCustomerDetailsSchema);