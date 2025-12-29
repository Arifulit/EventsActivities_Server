import { Response } from 'express';
import { Booking } from '../models/booking.model';
import { Event } from '../models/event.model';
import { Payment } from '../models/payment.model';
import { User } from '../models/user.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';
import { PaymentService } from '../services/payment.service';

export const confirmBookingPost = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return errorResponse(res, 'Booking ID is required', 400);
    }

    // Create a mock request object to reuse the existing confirmBooking logic
    const mockReq = Object.assign(req, { params: { id: bookingId } });
    
    return await confirmBooking(mockReq, res);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const createPaymentIntent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { eventId, quantity = 1 } = req.body;

    if (!eventId) {
      return errorResponse(res, 'Event ID is required', 400);
    }

    // Create payment intent using PaymentService
    const paymentIntent = await PaymentService.createPaymentIntent({
      eventId,
      userId: req.user._id.toString(),
      quantity
    });

    return successResponse(res, paymentIntent, 'Payment intent created successfully', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const createBooking = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { eventId, specialRequests, notes } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Check if event is open and not full
    if (event.status !== 'open') {
      return errorResponse(res, 'Event is not open for booking', 400);
    }

    if (event.currentParticipants >= event.maxParticipants) {
      return errorResponse(res, 'Event is full', 400);
    }

    // Check if user already has a booking for this event
    const existingBooking = await Booking.findOne({
      userId: req.user._id,
      eventId: eventId
    });

    if (existingBooking) {
      return errorResponse(res, 'You already have a booking for this event', 400);
    }

    // Create booking
    const booking = await Booking.create({
      userId: req.user._id,
      eventId: eventId,
      hostId: event.hostId,
      amount: event.price,
      specialRequests,
      notes,
      status: event.price > 0 ? 'pending' : 'confirmed',
      paymentStatus: event.price > 0 ? 'pending' : 'paid'
    });

    // If free event, confirm immediately
    if (event.price === 0) {
      event.participants.push(req.user._id);
      event.currentParticipants += 1;
      await event.save();

      req.user.joinedEvents.push(event._id);
      await req.user.save();
    }

    return successResponse(res, booking, 'Booking created successfully', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getBookings = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const type = req.query.type as string; // 'user' or 'host'

    let query: any = {};

    if (type === 'host') {
      query.hostId = req.user._id;
    } else {
      query.userId = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate('eventId', 'title date location price image')
      .populate('userId', 'fullName profileImage')
      .populate('hostId', 'fullName profileImage')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(query);

    return paginatedResponse(res, bookings, page, limit, total, 'Bookings retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getBookingById = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('eventId')
      .populate('userId', 'fullName profileImage email')
      .populate('hostId', 'fullName profileImage email');

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Check if user is the booking owner, host, or admin
    if (
      booking.userId._id.toString() !== req.user._id.toString() &&
      booking.hostId._id.toString() !== req.user._id.toString() &&
      req.user.role !== UserRole.ADMIN
    ) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, booking, 'Booking retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateBooking = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { status, specialRequests, notes } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Check if user is the booking owner or host
    if (
      booking.userId.toString() !== req.user._id.toString() &&
      booking.hostId.toString() !== req.user._id.toString() &&
      req.user.role !== UserRole.ADMIN
    ) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Only hosts can change booking status
    if (status && booking.hostId.toString() !== req.user._id.toString() && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Only hosts can change booking status', 403);
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { status, specialRequests, notes },
      { new: true, runValidators: true }
    ).populate('eventId', 'title date location');

    return successResponse(res, updatedBooking, 'Booking updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Check if user is the booking owner or host
    if (
      booking.userId.toString() !== req.user._id.toString() &&
      booking.hostId.toString() !== req.user._id.toString() &&
      req.user.role !== UserRole.ADMIN
    ) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Remove user from event participants if confirmed
    if (booking.status === 'confirmed') {
      const event = await Event.findById(booking.eventId);
      if (event) {
        (event.participants as any).pull(booking.userId);
        event.currentParticipants -= 1;
        
        // Update event status if it was full
        if (event.status === 'full') {
          event.status = 'open';
        }
        
        await event.save();
      }

      // Remove event from user's joined events
      const user = await User.findById(booking.userId);
      if (user) {
        (user.joinedEvents as any).pull(booking.eventId);
        await user.save();
      }
    }

    booking.status = 'cancelled';
    await booking.save();

    return successResponse(res, booking, 'Booking cancelled successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const confirmBooking = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Only hosts can confirm bookings
    if (booking.hostId.toString() !== req.user._id.toString() && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. Only hosts can confirm bookings', 403);
    }

    if (booking.status !== 'pending') {
      return errorResponse(res, 'Booking cannot be confirmed', 400);
    }

    // Check if payment is completed for paid events
    if (booking.paymentStatus !== 'paid') {
      return errorResponse(res, 'Payment must be completed before confirming booking', 400);
    }

    booking.status = 'confirmed';
    await booking.save();

    // Add user to event participants
    const event = await Event.findById(booking.eventId);
    if (event) {
      if (!event.participants.includes(booking.userId)) {
        event.participants.push(booking.userId);
        event.currentParticipants += 1;
        await event.save();
      }

      // Add event to user's joined events
      const user = await User.findById(booking.userId);
      if (user && !user.joinedEvents.includes(event._id)) {
        user.joinedEvents.push(event._id);
        await user.save();
      }
    }

    return successResponse(res, booking, 'Booking confirmed successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};