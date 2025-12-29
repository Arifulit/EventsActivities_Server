import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded' | 'disputed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  paymentIntentId?: string;
  amount: number;
  refundId?: string;
  refundAmount?: number;
  refundReason?: string;
  quantity: number;
  currency?: string;
  bookingDate: Date;
  specialRequests?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'refunded', 'disputed'],
      default: 'pending'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentId: {
      type: String,
      sparse: true
    },
    paymentIntentId: {
      type: String,
      sparse: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    currency: {
      type: String,
      default: 'usd'
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
    bookingDate: {
      type: Date,
      default: Date.now
    },
    specialRequests: {
      type: String,
      maxlength: [500, 'Special requests cannot exceed 500 characters']
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
  },
  {
    timestamps: true
  }
);

bookingSchema.index({ userId: 1 });
bookingSchema.index({ eventId: 1 });
bookingSchema.index({ hostId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ bookingDate: -1 });
bookingSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);