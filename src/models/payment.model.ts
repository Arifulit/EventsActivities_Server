import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod: 'stripe' | 'paypal' | 'sslcommerz' | 'cash';
  paymentIntentId?: string;
  transactionId?: string;
  gatewayResponse?: any;
  refundId?: string;
  refundAmount?: number;
  refundReason?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'BDT', 'INR']
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'paypal', 'sslcommerz', 'cash'],
      required: true
    },
    paymentIntentId: {
      type: String,
      sparse: true
    },
    transactionId: {
      type: String,
      sparse: true
    },
    gatewayResponse: {
      type: Schema.Types.Mixed
    },
    refundId: {
      type: String,
      sparse: true
    },
    refundAmount: {
      type: Number,
      min: 0
    },
    refundReason: {
      type: String,
      maxlength: [500, 'Refund reason cannot exceed 500 characters']
    },
    processedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ hostId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentIntentId: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
