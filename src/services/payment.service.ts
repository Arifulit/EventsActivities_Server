import Stripe from 'stripe';
import { Booking } from '../models/booking.model';
import { Event } from '../models/event.model';
import { User } from '../models/user.model';
import { config } from '../config/env';

export interface CreatePaymentIntentData {
  eventId: string;
  userId: string;
  quantity: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export interface RefundData {
  bookingId: string;
  reason?: string;
  amount?: number;
}

export interface PaymentMetadata {
  eventId: string;
  userId: string;
  bookingId?: string;
  quantity: number;
}

export class PaymentService {
  private static stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2023-10-16'
  });

  static async createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntentResponse> {
    const { eventId, userId, quantity } = data;

    // Validate event exists and is available
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status !== 'open') {
      throw new Error('Event is not available for booking');
    }

    if (event.date < new Date()) {
      throw new Error('Cannot book past events');
    }

    // Check availability
    const currentBookingsCount = await Booking.countDocuments({
      eventId,
      status: { $ne: 'cancelled' }
    });

    if (currentBookingsCount + quantity > event.maxParticipants) {
      throw new Error('Not enough spots available');
    }

    // Calculate amount (in cents for Stripe)
    const amount = Math.round(event.price * quantity * 100);

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: config.stripe.currency,
      metadata: {
        eventId,
        userId,
        quantity: quantity.toString()
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount,
      currency: config.stripe.currency
    };
  }

  static async confirmPayment(paymentIntentId: string): Promise<void> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment not successful');
      }

      // Validate and extract metadata
      const metadata = paymentIntent.metadata;
      if (!metadata.eventId || !metadata.userId || !metadata.quantity) {
        throw new Error('Invalid payment metadata');
      }

      const paymentMetadata: PaymentMetadata = {
        eventId: metadata.eventId,
        userId: metadata.userId,
        bookingId: metadata.bookingId || '', // Generate bookingId if not present
        quantity: parseInt(metadata.quantity)
      };

      // Create booking
      const existingBooking = await Booking.findOne({
        paymentIntentId,
        status: { $ne: 'cancelled' }
      });

      if (existingBooking) {
        throw new Error('Booking already exists for this payment');
      }

      const booking = new Booking({
        eventId: paymentMetadata.eventId,
        userId: paymentMetadata.userId,
        quantity: paymentMetadata.quantity,
        paymentIntentId,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        status: 'confirmed',
        paymentStatus: 'paid',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await booking.save();

      // Update event booking count
      await Event.findByIdAndUpdate(paymentMetadata.eventId, {
        $inc: { currentParticipants: paymentMetadata.quantity }
      });

    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw new Error('Failed to confirm payment');
    }
  }

  static async processRefund(data: RefundData): Promise<void> {
    const { bookingId, reason, amount } = data;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking already cancelled');
    }

    if (booking.paymentStatus !== 'paid') {
      throw new Error('No payment to refund');
    }

    try {
      // Get payment intent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(booking.paymentIntentId);

      // Calculate refund amount
      const refundAmount = amount ? Math.round(amount * 100) : paymentIntent.amount;

      // Create refund
      const refund = await this.stripe.refunds.create({
        payment_intent: booking.paymentIntentId,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
          bookingId,
          reason: reason || 'Customer requested refund'
        }
      });

      // Update booking
      booking.status = 'cancelled';
      booking.paymentStatus = 'refunded';
      booking.refundId = refund.id;
      booking.refundAmount = refundAmount / 100;
      booking.refundReason = reason;
      booking.updatedAt = new Date();

      await booking.save();

      // Update event booking count
      await Event.findByIdAndUpdate(booking.eventId, {
        $inc: { currentParticipants: -booking.quantity }
      });

    } catch (error) {
      console.error('Refund processing error:', error);
      throw new Error('Failed to process refund');
    }
  }

  static async getPaymentDetails(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new Error('Payment not found');
    }
  }

  static async getBookingPayments(userId: string) {
    const bookings = await Booking.find({ userId })
      .populate('eventId', 'title date location')
      .sort({ createdAt: -1 });

    return bookings.map(booking => ({
      id: booking._id,
      event: booking.eventId,
      quantity: booking.quantity,
      amount: booking.amount,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentIntentId: booking.paymentIntentId,
      refundAmount: booking.refundAmount,
      createdAt: booking.createdAt
    }));
  }

  static async getHostPayments(hostId: string) {
    // Get all events by this host
    const events = await Event.find({ hostId });
    const eventIds = events.map(event => event._id);

    // Get all bookings for these events
    const bookings = await Booking.find({
      eventId: { $in: eventIds },
      paymentStatus: 'paid'
    })
    .populate('eventId', 'title date')
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

    return bookings.map(booking => ({
      id: booking._id,
      event: booking.eventId,
      user: booking.userId,
      quantity: booking.quantity,
      amount: booking.amount,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      refundAmount: booking.refundAmount,
      createdAt: booking.createdAt
    }));
  }

  static async getHostEarnings(hostId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    eventId?: string;
  }) {
    // Get all events by this host
    const events = await Event.find({ hostId });
    const eventIds = events.map(event => event._id);

    // Build query
    const query: any = {
      eventId: { $in: eventIds },
      paymentStatus: 'paid',
      status: { $ne: 'cancelled' }
    };

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    if (filters?.eventId) {
      query.eventId = filters.eventId;
    }

    // Get bookings
    const bookings = await Booking.find(query);

    // Calculate earnings
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.amount, 0);
    const totalRefunds = bookings.reduce((sum, booking) => sum + (booking.refundAmount || 0), 0);
    const netEarnings = totalRevenue - totalRefunds;
    const totalBookings = bookings.length;

    return {
      totalRevenue,
      totalRefunds,
      netEarnings,
      totalBookings,
      averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0
    };
  }

  static async createPayout(hostId: string, amount: number) {
    // Verify host exists
    const host = await User.findById(hostId);
    if (!host || host.role !== 'host') {
      throw new Error('Host not found');
    }

    // Calculate available balance
    const earnings = await this.getHostEarnings(hostId);
    
    if (amount > earnings.netEarnings) {
      throw new Error('Insufficient available balance');
    }

    try {
      // Check if host has connected Stripe account
      if (!host.stripeAccountId) {
        throw new Error('Host has not connected a Stripe account for payouts');
      }

      // Create transfer to host's Stripe account
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: config.stripe.currency,
        destination: host.stripeAccountId,
        metadata: {
          hostId,
          type: 'payout'
        }
      });

      return {
        transferId: transfer.id,
        amount,
        currency: config.stripe.currency,
        reversed: transfer.reversed,
        created: transfer.created
      };

    } catch (error) {
      console.error('Payout creation error:', error);
      throw new Error('Failed to create payout');
    }
  }

  static async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'charge.dispute.created':
        await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Validate and extract metadata
    const metadata = paymentIntent.metadata;
    if (!metadata.eventId || !metadata.userId || !metadata.quantity) {
      console.error('Invalid payment metadata in webhook:', metadata);
      return;
    }

    const paymentMetadata: PaymentMetadata = {
      eventId: metadata.eventId,
      userId: metadata.userId,
      bookingId: metadata.bookingId || '', // Generate bookingId if not present
      quantity: parseInt(metadata.quantity)
    };
    
    // Create booking if not already created
    const existingBooking = await Booking.findOne({
      paymentIntentId: paymentIntent.id,
      status: { $ne: 'cancelled' }
    });

    if (!existingBooking) {
      const booking = new Booking({
        eventId: paymentMetadata.eventId,
        userId: paymentMetadata.userId,
        quantity: paymentMetadata.quantity,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'confirmed',
        paymentStatus: 'paid',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await booking.save();

      // Update event booking count
      await Event.findByIdAndUpdate(paymentMetadata.eventId, {
        $inc: { currentParticipants: paymentMetadata.quantity }
      });
    }
  }

  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Log payment failure
    console.error(`Payment failed: ${paymentIntent.id}`, {
      metadata: paymentIntent.metadata,
      last_payment_error: paymentIntent.last_payment_error
    });
  }

  private static async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    // Find booking related to this charge (access charge through dispute)
    const booking = await Booking.findOne({
      paymentIntentId: dispute.payment_intent as string
    });

    if (booking) {
      // Update booking status
      booking.status = 'disputed';
      booking.updatedAt = new Date();
      await booking.save();

      // Notify admin about dispute
      console.warn(`Dispute created for booking: ${booking._id}`, dispute);
    }
  }

  static async validatePayment(paymentIntentId: string, expectedAmount: number): Promise<boolean> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return paymentIntent.status === 'succeeded' && 
             paymentIntent.amount === Math.round(expectedAmount * 100);
    } catch (error) {
      return false;
    }
  }
}