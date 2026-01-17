import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for Customer Details
export interface ICustomerDetails extends Document {
  // Basic Customer Information
  name: string;
  mobileNumber: string;
  address: string;
  adharNumber: string;
  panNumber: string;
  
  // Project and Flat Information
  selectedProject: string;
  selectedFlat: string;
  north: string;
  south: string;
  east: string;
  west: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Payment Schedule
export interface IPaymentSchedule extends Document {
  // Reference to customer
  customerId: mongoose.Types.ObjectId;
  bookingId: string; // Unique booking identifier
  
  // Customer Information (for quick access)
  customerName: string;
  customerMobile: string;
  projectName: string;
  flatNumber: string;
  
  // Payment Stage Dates (ISO format)
  paymentDates: {
    bookingTokenDate?: Date;
    foundationWorkDate?: Date;
    floorSlabDate?: Date;
    brickworkPlumbingDate?: Date;
    finalWorksDate?: Date;
    finishingWorkDate?: Date;
    registryDate?: Date;
  };
  
  // Payment Stage Percentages
  paymentPercentages: {
    bookingTokenPercentage: number; // Default 25%
    foundationWorkPercentage: number; // Default 5%
    floorSlabPercentage: number; // Default 25%
    brickworkPlumbingPercentage: number; // Default 25%
    finalWorksPercentage: number; // Default 10%
    finishingWorkPercentage: number; // Default 5%
    registryPercentage: number; // Default 5%
  };
  
  // Payment Stage Amounts (calculated based on total cost)
  paymentAmounts: {
    totalAmount: number;
    bookingTokenAmount: number;
    foundationWorkAmount: number;
    floorSlabAmount: number;
    brickworkPlumbingAmount: number;
    finalWorksAmount: number;
    finishingWorkAmount: number;
    registryAmount: number;
  };
  
  // Other Charges
  otherCharges: {
    electricMeterCharges: number;
    generatorCharges: number;
    gstPercentage: number;
    registrationCharges: string;
  };
  
  // Payment Plan Information
  paymentPlan: {
    selectedPaymentPlan: string; // 'construction-linked', 'time-linked', etc.
    homeLoanAmount?: number;
    homeLoanPercentage: number;
    selfContributionPercentage: number;
  };
  
  // Notification Status for each stage
  notificationStatus: {
    bookingTokenNotified: boolean;
    foundationWorkNotified: boolean;
    floorSlabNotified: boolean;
    brickworkPlumbingNotified: boolean;
    finalWorksNotified: boolean;
    finishingWorkNotified: boolean;
    registryNotified: boolean;
  };
  
  // Additional Information
  promoCode?: string;
  remarks?: string;
  termsAccepted: boolean;
  
  // Status
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Notification Queue
export interface INotificationQueue extends Document {
  // Reference to payment schedule
  paymentScheduleId: mongoose.Types.ObjectId;
  
  // Notification Details
  stageName: string; // 'booking-token', 'foundation-work', etc.
  customerName: string;
  customerMobile: string;
  paymentDate: Date;
  notificationDate: Date; // When to send notification (e.g., 3 days before)
  
  // Message Content
  message: string;
  messageType: 'sms' | 'email' | 'whatsapp';
  
  // Status
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: Date;
  failureReason?: string;
  
  // Retry Information
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Customer Details Schema
const CustomerDetailsSchema = new Schema<ICustomerDetails>({
  // Basic Customer Information
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'],
    index: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  adharNumber: {
    type: String,
    required: [true, 'Aadhar number is required'],
    unique: true,
    match: [/^\d{12}$/, 'Please enter a valid 12-digit Aadhar number'],
    index: true
  },
  panNumber: {
    type: String,
    required: [true, 'PAN number is required'],
    unique: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number'],
    index: true
  },
  
  // Project and Flat Information
  selectedProject: {
    type: String,
    required: [true, 'Project selection is required'],
  },
  selectedFlat: {
    type: String,
    required: [true, 'Flat selection is required'],
    trim: true
  },
  north: {  
    type: String,
    required: [true, 'Direction details are required'],
    trim: true,
    maxlength: [1000, 'Direction details cannot exceed 1000 characters']
  },
  south: {  
    type: String,
    required: [true, 'Direction details are required'],
    trim: true,
    maxlength: [1000, 'Direction details cannot exceed 1000 characters']
  },
  east: {  
    type: String,
    required: [true, 'Direction details are required'],
    trim: true,
    maxlength: [1000, 'Direction details cannot exceed 1000 characters']
  },
  west: {  
    type: String,
    required: [true, 'Direction details are required'],
    trim: true,
    maxlength: [1000, 'Direction details cannot exceed 1000 characters']
  },
}, {
  timestamps: true,
  collection: 'customerDetails'
});

// Payment Schedule Schema
const PaymentScheduleSchema = new Schema<IPaymentSchedule>({
  // Reference to customer
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'CustomerDetails',
    required: true,
    index: true
  },
  bookingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Customer Information (for quick access)
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerMobile: {
    type: String,
    required: true,
    index: true
  },
  projectName: {
    type: String,
    required: true
  },
  flatNumber: {
    type: String,
    required: true
  },
  
  // Payment Stage Dates
  paymentDates: {
    bookingTokenDate: Date,
    foundationWorkDate: Date,
    floorSlabDate: Date,
    brickworkPlumbingDate: Date,
    finalWorksDate: Date,
    finishingWorkDate: Date,
    registryDate: Date
  },
  
  // Payment Stage Percentages
  paymentPercentages: {
    bookingTokenPercentage: { type: Number, default: 25, min: 0, max: 100 },
    foundationWorkPercentage: { type: Number, default: 5, min: 0, max: 100 },
    floorSlabPercentage: { type: Number, default: 25, min: 0, max: 100 },
    brickworkPlumbingPercentage: { type: Number, default: 25, min: 0, max: 100 },
    finalWorksPercentage: { type: Number, default: 10, min: 0, max: 100 },
    finishingWorkPercentage: { type: Number, default: 5, min: 0, max: 100 },
    registryPercentage: { type: Number, default: 5, min: 0, max: 100 }
  },
  
  // Payment Stage Amounts
  paymentAmounts: {
    totalAmount: { type: Number, required: true, min: 0 },
    bookingTokenAmount: { type: Number, required: true, min: 0 },
    foundationWorkAmount: { type: Number, required: true, min: 0 },
    floorSlabAmount: { type: Number, required: true, min: 0 },
    brickworkPlumbingAmount: { type: Number, required: true, min: 0 },
    finalWorksAmount: { type: Number, required: true, min: 0 },
    finishingWorkAmount: { type: Number, required: true, min: 0 },
    registryAmount: { type: Number, required: true, min: 0 }
  },
  
  // Other Charges
  otherCharges: {
    electricMeterCharges: { type: Number, default: 60000, min: 0 },
    generatorCharges: { type: Number, default: 30000, min: 0 },
    gstPercentage: { type: Number, default: 1, min: 0, max: 100 },
    registrationCharges: { type: String, default: 'As per government norms' }
  },
  
  // Payment Plan Information
  paymentPlan: {
    selectedPaymentPlan: {
      type: String,
      required: true,
      enum: ['construction-linked', 'time-linked', 'possession-linked'],
      default: 'construction-linked'
    },
    homeLoanAmount: { type: Number, min: 0 },
    homeLoanPercentage: { type: Number, default: 60, min: 0, max: 100 },
    selfContributionPercentage: { type: Number, default: 40, min: 0, max: 100 }
  },
  
  // Notification Status
  notificationStatus: {
    bookingTokenNotified: { type: Boolean, default: false },
    foundationWorkNotified: { type: Boolean, default: false },
    floorSlabNotified: { type: Boolean, default: false },
    brickworkPlumbingNotified: { type: Boolean, default: false },
    finalWorksNotified: { type: Boolean, default: false },
    finishingWorkNotified: { type: Boolean, default: false },
    registryNotified: { type: Boolean, default: false }
  },
  
  // Additional Information
  promoCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [1000, 'Remarks cannot exceed 1000 characters']
  },
  termsAccepted: {
    type: Boolean,
    required: true,
    validate: {
      validator: function(v: boolean) {
        return v === true;
      },
      message: 'Terms and conditions must be accepted'
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'on-hold'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true,
  collection: 'paymentSchedules'
});

// Notification Queue Schema
const NotificationQueueSchema = new Schema<INotificationQueue>({
  // Reference to payment schedule
  paymentScheduleId: {
    type: Schema.Types.ObjectId,
    ref: 'PaymentSchedule',
    required: true,
    index: true
  },
  
  // Notification Details
  stageName: {
    type: String,
    required: true,
    enum: [
      'booking-token',
      'foundation-work',
      'floor-slab',
      'brickwork-plumbing',
      'final-works',
      'finishing-work',
      'registry'
    ],
    index: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerMobile: {
    type: String,
    required: true,
    index: true
  },
  paymentDate: {
    type: Date,
    required: true,
    index: true
  },
  notificationDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Message Content
  message: {
    type: String,
    required: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['sms', 'email', 'whatsapp'],
    default: 'sms'
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  sentAt: Date,
  failureReason: String,
  
  // Retry Information
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0
  },
  nextRetryAt: Date
}, {
  timestamps: true,
  collection: 'notificationQueue'
});

// Indexes for better performance
CustomerDetailsSchema.index({ mobileNumber: 1, selectedProject: 1 });
CustomerDetailsSchema.index({ createdAt: -1 });

PaymentScheduleSchema.index({ customerId: 1, status: 1 });
PaymentScheduleSchema.index({ customerMobile: 1, status: 1 });
PaymentScheduleSchema.index({ 'paymentDates.bookingTokenDate': 1 });
PaymentScheduleSchema.index({ 'paymentDates.foundationWorkDate': 1 });
PaymentScheduleSchema.index({ 'paymentDates.floorSlabDate': 1 });
PaymentScheduleSchema.index({ 'paymentDates.brickworkPlumbingDate': 1 });
PaymentScheduleSchema.index({ 'paymentDates.finalWorksDate': 1 });
PaymentScheduleSchema.index({ 'paymentDates.finishingWorkDate': 1 });
PaymentScheduleSchema.index({ 'paymentDates.registryDate': 1 });

NotificationQueueSchema.index({ notificationDate: 1, status: 1 });
NotificationQueueSchema.index({ customerMobile: 1, createdAt: -1 });

// Pre-save middleware for CustomerDetails
CustomerDetailsSchema.pre('save', function(next) {
  // Convert PAN to uppercase
  if (this.panNumber) {
    this.panNumber = this.panNumber.toUpperCase();
  }
  next();
});

// Pre-save middleware for PaymentSchedule
PaymentScheduleSchema.pre('save', function(next) {
  // Validate that percentages add up to 100%
  const totalPercentage = 
    this.paymentPercentages.bookingTokenPercentage +
    this.paymentPercentages.foundationWorkPercentage +
    this.paymentPercentages.floorSlabPercentage +
    this.paymentPercentages.brickworkPlumbingPercentage +
    this.paymentPercentages.finalWorksPercentage +
    this.paymentPercentages.finishingWorkPercentage +
    this.paymentPercentages.registryPercentage;
  
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return next(new Error('Payment percentages must add up to 100%'));
  }
  
  // Calculate payment amounts based on percentages
  const total = this.paymentAmounts.totalAmount;
  this.paymentAmounts.bookingTokenAmount = Math.round((total * this.paymentPercentages.bookingTokenPercentage) / 100);
  this.paymentAmounts.foundationWorkAmount = Math.round((total * this.paymentPercentages.foundationWorkPercentage) / 100);
  this.paymentAmounts.floorSlabAmount = Math.round((total * this.paymentPercentages.floorSlabPercentage) / 100);
  this.paymentAmounts.brickworkPlumbingAmount = Math.round((total * this.paymentPercentages.brickworkPlumbingPercentage) / 100);
  this.paymentAmounts.finalWorksAmount = Math.round((total * this.paymentPercentages.finalWorksPercentage) / 100);
  this.paymentAmounts.finishingWorkAmount = Math.round((total * this.paymentPercentages.finishingWorkPercentage) / 100);
  this.paymentAmounts.registryAmount = Math.round((total * this.paymentPercentages.registryPercentage) / 100);
  
  next();
});

// Static methods for CustomerDetails
CustomerDetailsSchema.statics.findByMobile = function(mobile: string) {
  return this.findOne({ mobileNumber: mobile });
};

CustomerDetailsSchema.statics.findByProject = function(project: string) {
  return this.find({ selectedProject: project });
};

// Static methods for PaymentSchedule
PaymentScheduleSchema.statics.findUpcomingPayments = function(days: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    $or: [
      { 'paymentDates.bookingTokenDate': { $lte: futureDate }, 'notificationStatus.bookingTokenNotified': false },
      { 'paymentDates.foundationWorkDate': { $lte: futureDate }, 'notificationStatus.foundationWorkNotified': false },
      { 'paymentDates.floorSlabDate': { $lte: futureDate }, 'notificationStatus.floorSlabNotified': false },
      { 'paymentDates.brickworkPlumbingDate': { $lte: futureDate }, 'notificationStatus.brickworkPlumbingNotified': false },
      { 'paymentDates.finalWorksDate': { $lte: futureDate }, 'notificationStatus.finalWorksNotified': false },
      { 'paymentDates.finishingWorkDate': { $lte: futureDate }, 'notificationStatus.finishingWorkNotified': false },
      { 'paymentDates.registryDate': { $lte: futureDate }, 'notificationStatus.registryNotified': false }
    ]
  });
};

// Static methods for NotificationQueue
NotificationQueueSchema.statics.findPendingNotifications = function() {
  return this.find({
    status: 'pending',
    notificationDate: { $lte: new Date() }
  }).sort({ notificationDate: 1 });
};

// Create and export models
export const CustomerDetails: Model<ICustomerDetails> = mongoose.models.CustomerDetails || mongoose.model<ICustomerDetails>('CustomerDetails', CustomerDetailsSchema);
export const PaymentSchedule: Model<IPaymentSchedule> = mongoose.models.PaymentSchedule || mongoose.model<IPaymentSchedule>('PaymentSchedule', PaymentScheduleSchema);
export const NotificationQueue: Model<INotificationQueue> = mongoose.models.NotificationQueue || mongoose.model<INotificationQueue>('NotificationQueue', NotificationQueueSchema);