import { Schema, model, models } from "mongoose";

// Payment Schedule Schema - Step 2 of booking process
const PaymentScheduleSchema = new Schema(
  {
    // Reference to Booking
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    // Customer Information
    customerName: {
      type: String,
      required: true,
    },
    customerMobile: {
      type: String,
      required: true,
    },

    // Property Information
    projectName: {
      type: String,
      required: true,
    },
    flatNumber: {
      type: String,
      required: true,
    },

    // Total Amount
    totalAmount: {
      type: Number,
      required: true,
    },
    bookingAmount: {
      type: Number,
      required: true,
    },

    // Loan Information
    homeLoanPercentage: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },
    selfContributionPercentage: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },
    homeLoanAmount: {
      type: Number,
      required: false,
    },
    selfContributionAmount: {
      type: Number,
      required: false,
    },

    // Payment Stages with Dates and Percentages
    paymentStages: [
      {
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
        },
        stageLabel: {
          type: String,
          required: true,
        },
        percentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        amount: {
          type: Number,
          required: true,
        },
        dueDate: {
          type: Date,
          required: true,
        },
        status: {
          type: String,
          required: true,
          enum: ['pending', 'paid', 'overdue', 'waived'],
          default: 'pending',
        },
        paidAmount: {
          type: Number,
          default: 0,
        },
        paidDate: {
          type: Date,
          required: false,
        },
        paymentMode: {
          type: String,
          required: false,
          enum: ['cash', 'cheque', 'online-transfer', 'upi', 'card', 'bank-loan'],
        },
        transactionId: {
          type: String,
          required: false,
        },
        receiptNumber: {
          type: String,
          required: false,
        },
        remarks: {
          type: String,
          required: false,
        },
      }
    ],

    // Installment Plan
    installmentPlan: {
      type: String,
      required: true,
      enum: [
        'full-payment',
        'construction-linked',
        'time-linked-quarterly',
        'time-linked-half-yearly',
        'custom'
      ],
    },

    // Payment Mode
    preferredPaymentMode: {
      type: String,
      required: false,
      enum: ['cash', 'cheque', 'online-transfer', 'upi', 'card', 'bank-loan'],
    },

    // Bank Details (for loan or payment)
    bankDetails: {
      bankName: {
        type: String,
        required: false,
      },
      accountNumber: {
        type: String,
        required: false,
      },
      ifscCode: {
        type: String,
        required: false,
      },
      branchName: {
        type: String,
        required: false,
      },
      loanAccountNumber: {
        type: String,
        required: false,
      },
    },

    // Notification Tracking
    notifications: [
      {
        stageName: {
          type: String,
          required: true,
        },
        notificationDate: {
          type: Date,
          required: true,
        },
        notificationType: {
          type: String,
          required: true,
          enum: ['sms', 'email', 'whatsapp', 'call'],
        },
        status: {
          type: String,
          required: true,
          enum: ['pending', 'sent', 'failed', 'delivered'],
          default: 'pending',
        },
        sentAt: {
          type: Date,
          required: false,
        },
        message: {
          type: String,
          required: false,
        },
        errorMessage: {
          type: String,
          required: false,
        },
      }
    ],

    // Terms and Conditions
    termsAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
      required: false,
    },

    // Additional Information
    remarks: {
      type: String,
      required: false,
    },

    // Status
    status: {
      type: String,
      required: true,
      enum: ['active', 'completed', 'defaulted', 'cancelled'],
      default: 'active',
    },

    // Completion Tracking
    totalPaid: {
      type: Number,
      default: 0,
    },
    totalPending: {
      type: Number,
      required: true,
    },
    completedAt: {
      type: Date,
      required: false,
    },

    // Cancellation
    cancelledAt: {
      type: Date,
      required: false,
    },
    cancellationReason: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PaymentScheduleSchema.index({ bookingId: 1 });
PaymentScheduleSchema.index({ customerMobile: 1 });
PaymentScheduleSchema.index({ status: 1 });
PaymentScheduleSchema.index({ 'paymentStages.dueDate': 1 });
PaymentScheduleSchema.index({ 'paymentStages.status': 1 });
PaymentScheduleSchema.index({ 'notifications.notificationDate': 1 });
PaymentScheduleSchema.index({ 'notifications.status': 1 });

// Virtual for calculating payment progress
PaymentScheduleSchema.virtual('paymentProgress').get(function() {
  if (this.totalAmount === 0) return 0;
  return (this.totalPaid / this.totalAmount) * 100;
});

// Method to get upcoming payments
PaymentScheduleSchema.methods.getUpcomingPayments = function(days: number = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return this.paymentStages.filter((stage: any) => {
    return stage.status === 'pending' && 
           stage.dueDate >= today && 
           stage.dueDate <= futureDate;
  });
};

// Method to get overdue payments
PaymentScheduleSchema.methods.getOverduePayments = function() {
  const today = new Date();
  
  return this.paymentStages.filter((stage: any) => {
    return stage.status === 'pending' && stage.dueDate < today;
  });
};

export const PaymentSchedule = models.PaymentSchedule || model("PaymentSchedule", PaymentScheduleSchema);
