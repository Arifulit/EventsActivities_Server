import { Response } from 'express';
import { Payment } from '../models/payment.model';
import { Event } from '../models/event.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';
import { config } from '../config/env';
import Stripe from 'stripe';

const stripe = new Stripe(config.stripe.secretKey || '', {
  apiVersion: '2023-10-16'
});

export const createPaymentIntent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { eventId, quantity = 1 } = req.body;

    if (!eventId) {
      return errorResponse(res, 'Event ID is required', 400);
    }

    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Calculate amount (in cents for Stripe)
    const amount = Math.round(event.price * quantity * 100);

    if (amount <= 0) {
      return errorResponse(res, 'Invalid amount for payment', 400);
    }

    // Check if user already has a booking for this event
    const { Booking } = require('../models/booking.model');
    const existingBooking = await Booking.findOne({
      userId: req.user._id,
      eventId: eventId
    });

    if (existingBooking) {
      return errorResponse(res, 'You have already booked this event', 400);
    }

    // Create or find booking first
    const booking = await Booking.create({
      userId: req.user._id,
      eventId,
      hostId: event.hostId,
      quantity,
      amount: event.price * quantity,
      status: 'pending',
      paymentStatus: 'pending',
      bookingDate: new Date()
    });

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        eventId: eventId.toString(),
        userId: req.user._id.toString(),
        bookingId: booking._id.toString(),
        quantity: quantity.toString()
      }
    });

    // Save payment record to database
    console.log('Creating payment with userId:', req.user._id);
    console.log('User object type:', typeof req.user._id);
    
    const payment = await Payment.create({
      userId: req.user._id,
      hostId: event.hostId,
      eventId,
      bookingId: booking._id,
      amount: event.price * quantity,
      currency: 'USD',
      status: 'pending',
      paymentMethod: 'stripe',
      paymentIntentId: paymentIntent.id
    });

    return successResponse(
      res,
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        paymentId: payment._id,
        bookingId: booking._id
      },
      'Payment intent created successfully',
      201
    );
  } catch (error: any) {
    console.error('Payment intent creation error:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000 && error.keyPattern && error.keyPattern.userId && error.keyPattern.eventId) {
      return errorResponse(res, 'You have already booked this event', 400);
    }
    
    // Handle Stripe errors
    if (error.type && error.type.startsWith('Stripe')) {
      return errorResponse(res, `Payment error: ${error.message}`, 400);
    }
    
    return errorResponse(res, error.message || 'Failed to create payment intent', 500);
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { paymentIntentId, bookingId, paymentMethodId, returnUrl } = req.body;

    if (!paymentIntentId) {
      return errorResponse(res, 'Payment Intent ID is required', 400);
    }

    // Retrieve payment intent from Stripe
    let paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return errorResponse(res, 'Payment intent not found', 404);
    }

    // Find payment in database (by intent or booking for safety)
    const payment = await Payment.findOne(
      bookingId ? { $or: [{ paymentIntentId }, { bookingId }] } : { paymentIntentId }
    );

    if (!payment) {
      return errorResponse(res, 'Payment record not found', 404);
    }

    // Verify payment belongs to user
    console.log('Payment userId:', payment.userId);
    console.log('Authenticated userId:', req.user._id);
    console.log('Comparison result:', payment.userId.toString() !== req.user._id.toString());
    
    if (payment.userId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized access to payment', 403);
    }

    // If Stripe still needs confirmation/payment method, try to confirm server-side when a paymentMethodId is provided
    if (
      (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'requires_confirmation') &&
      paymentMethodId
    ) {
      const confirmParams: Stripe.PaymentIntentConfirmParams = {
        payment_method: paymentMethodId
      };

      if (returnUrl) {
        confirmParams.return_url = returnUrl;
      }

      paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, confirmParams);
    }

    const extractedPaymentMethodId = typeof paymentIntent.payment_method === 'string'
      ? paymentIntent.payment_method
      : paymentIntent.payment_method?.id;

    // Update payment status based on Stripe status
    if (paymentIntent.status === 'succeeded') {
      payment.status = 'succeeded';
      payment.processedAt = new Date();
      if (extractedPaymentMethodId) {
        payment.paymentMethodId = extractedPaymentMethodId;
      }
      await payment.save();

      // Update booking status
      const { Booking } = require('../models/booking.model');
      const booking = await Booking.findById(payment.bookingId || bookingId);
      if (booking) {
        booking.status = 'confirmed';
        booking.paymentStatus = 'paid';
        booking.paymentId = payment._id.toString();
        booking.paymentIntentId = paymentIntentId;
        await booking.save();

        // Update event participants
        await Event.findByIdAndUpdate(
          payment.eventId,
          { $addToSet: { participants: req.user._id } }
        );
      }

      return successResponse(
        res,
        {
          payment,
          booking,
          paymentMethodId: extractedPaymentMethodId,
          status: 'succeeded',
          message: 'Payment completed successfully'
        },
        'Payment confirmed successfully'
      );
    } else if (paymentIntent.status === 'requires_action') {
      // Frontend must handle 3DS or similar with the client_secret
      return successResponse(
        res,
        {
          status: 'requires_action',
          clientSecret: paymentIntent.client_secret,
          paymentMethodId: extractedPaymentMethodId,
          message: 'Additional authentication required. Please complete 3D Secure.'
        },
        'Payment requires additional action'
      );
    } else if (paymentIntent.status === 'processing') {
      payment.status = 'processing';
      if (extractedPaymentMethodId) {
        payment.paymentMethodId = extractedPaymentMethodId;
      }
      await payment.save();

      return successResponse(
        res,
        {
          payment,
          paymentMethodId: extractedPaymentMethodId,
          status: 'processing',
          message: 'Payment is being processed, please check back later'
        },
        'Payment is being processed'
      );
    } else if (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'requires_confirmation') {
      return errorResponse(
        res,
        paymentMethodId
          ? 'Payment confirmation failed. Please try again with a valid payment method.'
          : 'Payment incomplete. Provide a paymentMethodId or complete payment on the frontend with the client secret.',
        400
      );
    } else {
      payment.status = 'failed';
      await payment.save();

      // Update booking status
      const { Booking } = require('../models/booking.model');
      await Booking.findByIdAndUpdate(payment.bookingId, {
        status: 'cancelled',
        paymentStatus: 'failed'
      });

      return errorResponse(
        res,
        `Payment failed with status: ${paymentIntent.status}`,
        400
      );
    }
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const testConfirmPayment = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { bookingId, paymentIntentId } = req.body;

    if (!bookingId && !paymentIntentId) {
      return errorResponse(res, 'Either bookingId or paymentIntentId is required', 400);
    }

    // Only allow in development
    if (config.nodeEnv === 'production') {
      return errorResponse(res, 'Test endpoint not available in production', 403);
    }

    // Find payment by bookingId or paymentIntentId
    const payment = await Payment.findOne(
      bookingId ? { bookingId } : { paymentIntentId }
    );

    if (!payment) {
      return errorResponse(res, 'Payment record not found', 404);
    }

    // Verify the payment belongs to the user
    if (payment.userId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized access to payment', 403);
    }

    // Simulate successful payment
    payment.status = 'succeeded';
    payment.processedAt = new Date();
    await payment.save();

    // Update booking status
    const { Booking } = require('../models/booking.model');
    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      booking.paymentId = payment._id.toString();
      booking.paymentIntentId = payment.paymentIntentId;
      await booking.save();

      // Update event participants
      await Event.findByIdAndUpdate(
        payment.eventId,
        { $addToSet: { participants: req.user._id } }
      );
    }

    return successResponse(
      res,
      {
        payment,
        booking,
        status: 'succeeded',
        message: '[TEST MODE] Payment confirmed successfully without Stripe'
      },
      '[TEST] Payment confirmed successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getHostPayments = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    // Only hosts or admins can view host payments
    if (req.user.role !== UserRole.HOST && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. Host role required.', 403);
    }

    const query: any = { hostId: req.user._id };

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(query)
      .populate('eventId', 'title date')
      .populate('bookingId', 'status paymentStatus bookingDate')
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments(query);

    return paginatedResponse(res, payments, page, limit, total, 'Payments retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getHostEarningsSummary = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.user.role !== UserRole.HOST && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. Host role required.', 403);
    }

    const [summary] = await Payment.aggregate([
      { $match: { hostId: req.user._id } },
      {
        $group: {
          _id: null,
          totalReceived: {
            $sum: {
              $cond: [ { $eq: ['$status', 'succeeded'] }, '$amount', 0 ]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [ { $in: ['$status', ['pending', 'processing']] }, 1, 0 ]
            }
          },
          refundTotal: {
            $sum: {
              $cond: [ { $eq: ['$status', 'refunded'] }, '$refundAmount', 0 ]
            }
          },
          paymentCount: { $sum: 1 }
        }
      }
    ]);

    const last30Days = await Payment.aggregate([
      {
        $match: {
          hostId: req.user._id,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          status: 'succeeded'
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' }
        }
      }
    ]);

    return successResponse(
      res,
      {
        totalReceived: summary?.totalReceived || 0,
        paymentCount: summary?.paymentCount || 0,
        pendingCount: summary?.pendingCount || 0,
        refundTotal: summary?.refundTotal || 0,
        last30DaysReceived: last30Days[0]?.amount || 0
      },
      'Earnings summary retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};
