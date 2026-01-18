import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Event } from '../models/event.model';
import { User } from '../models/user.model';
import { Payment } from '../models/payment.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';

export const createEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Handle image uploads from form-data (multer.any() format)
    const files = req.files as Express.Multer.File[];
    const eventData: any = {
      ...req.body,
      hostId: req.user._id,
      currentParticipants: 0
    };

    // Process uploaded files if any
    if (files && files.length > 0) {
      const { uploadImage } = require('../services/cloudinary.service');
      
      // Find main image file (fieldname: 'image')
      const mainImageFile = files.find(f => f.fieldname === 'image');
      if (mainImageFile) {
        const imageUrl = await uploadImage(mainImageFile.buffer, 'events');
        eventData.image = imageUrl;
      }

      // Find all gallery images (fieldname: 'images')
      const galleryFiles = files.filter(f => f.fieldname === 'images');
      if (galleryFiles.length > 0) {
        const imageUrls = await Promise.all(
          galleryFiles.map((file) => uploadImage(file.buffer, 'events'))
        );
        eventData.images = imageUrls;
      }
    }

    const event = await Event.create(eventData);
    
    // Add event to host's hosted events
    await req.user.hostedEvents.push(event._id);
    await req.user.save();

    return successResponse(res, event, 'Event created successfully', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getEvents = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const type = req.query.type as string;
    const category = req.query.category as string;
    const city = (req.query.city || req.query.location) as string;
    const minPrice = req.query.minPrice as string;
    const maxPrice = req.query.maxPrice as string;
    const isFree = req.query.isFree as string;
    const dateFrom = (req.query.dateFrom || req.query.startDate) as string;
    const dateTo = (req.query.dateTo || req.query.endDate) as string;
    const status = req.query.status as string || 'open';

    const query: any = {};

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Filters
    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    // Handle isFree parameter
    if (isFree === 'true') {
      query.price = 0;
    } else if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    if (status) {
      query.status = status;
    }

    // Only show public events
    query.isPublic = true;

    const skip = (page - 1) * limit;

    const events = await Event.find(query)
      .populate('hostId', 'fullName profileImage averageRating')
      .sort({ date: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(query);

    return paginatedResponse(res, events, page, limit, total, 'Events retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getEventById = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const eventId = Array.isArray(id) ? id[0] : id;

    if (!Types.ObjectId.isValid(eventId)) {
      return errorResponse(res, 'Invalid event id', 400);
    }

    const event = await Event.findById(eventId)
      .populate('hostId', 'fullName profileImage bio averageRating totalReviews')
      .populate('participants', 'fullName profileImage')
      .populate('waitingList', 'fullName profileImage');

    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Check if event is public or user is authenticated and is the host
    if (!event.isPublic && (!req.user || event.hostId._id.toString() !== req.user._id.toString())) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, event, 'Event retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Get hostId as string (handle both ObjectId and populated object)
    const eventHostId = typeof event.hostId === 'object' && event.hostId._id 
      ? event.hostId._id.toString() 
      : event.hostId.toString();

    // Normalize role for comparison (handle case sensitivity)
    const userRole = req.user.role?.toString().toLowerCase();
    const currentUserId = req.user._id.toString();

    // Check authorization: Admin can update any event, Host can update only their own events
    const isAdmin = userRole === 'admin';
    const isEventOwner = eventHostId === currentUserId;
    const isHost = userRole === 'host';

    // Allow update if: user is admin OR (user is host AND owns this event)
    if (!isAdmin && !(isHost && isEventOwner)) {
      return errorResponse(res, 'Access denied. Only event host can update event', 403);
    }

    // Handle image uploads from form-data (multer.any() format)
    const files = req.files as Express.Multer.File[];
    const updateData: any = { ...req.body };

    // Process uploaded files if any
    if (files && files.length > 0) {
      const { uploadImage } = require('../services/cloudinary.service');
      
      // Find main image file (fieldname: 'image')
      const mainImageFile = files.find(f => f.fieldname === 'image');
      if (mainImageFile) {
        const imageUrl = await uploadImage(mainImageFile.buffer, 'events');
        updateData.image = imageUrl;
      }

      // Find all gallery images (fieldname: 'images')
      const galleryFiles = files.filter(f => f.fieldname === 'images');
      if (galleryFiles.length > 0) {
        const imageUrls = await Promise.all(
          galleryFiles.map((file) => uploadImage(file.buffer, 'events'))
        );
        updateData.images = imageUrls;
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('hostId', 'fullName profileImage');

    return successResponse(res, updatedEvent, 'Event updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Get hostId as string (handle both ObjectId and populated object)
    const eventHostId = typeof event.hostId === 'object' && event.hostId._id 
      ? event.hostId._id.toString() 
      : event.hostId.toString();

    // Normalize role for comparison (handle case sensitivity)
    const userRole = req.user.role?.toString().toLowerCase();
    const currentUserId = req.user._id.toString();

    // Check authorization: Admin can delete any event, Host can delete only their own events
    const isAdmin = userRole === 'admin';
    const isEventOwner = eventHostId === currentUserId;
    const isHost = userRole === 'host';

    // Allow delete if: user is admin OR (user is host AND owns this event)
    if (!isAdmin && !(isHost && isEventOwner)) {
      return errorResponse(res, 'Access denied. Only event host can delete event', 403);
    }

    await Event.findByIdAndDelete(id);

    // Remove event from host's hosted events
    await req.user.hostedEvents.pull(id);
    await req.user.save();

    return successResponse(res, event, 'Event deleted successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const joinEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Check if event is cancelled
    if (event.status === 'cancelled') {
      return errorResponse(res, 'Cannot join a cancelled event', 400);
    }

    // Check if event is in draft mode
    if (event.status === 'draft') {
      return errorResponse(res, 'This event is not published yet', 400);
    }

    // Check if event date has passed (for completed events)
    const eventDateTime = new Date(event.date);
    const now = new Date();
    if (event.status === 'completed' && eventDateTime < now) {
      return errorResponse(res, 'Cannot join a past event', 400);
    }

    // Check capacity
    if (event.currentParticipants >= event.maxParticipants) {
      return errorResponse(res, 'Event is full', 400);
    }

    // Check if user is already a participant
    if (event.participants.includes(req.user._id)) {
      return errorResponse(res, 'You are already a participant', 400);
    }

    // Check if user is the host
    if (event.hostId.toString() === req.user._id.toString()) {
      return errorResponse(res, 'You cannot join your own event', 400);
    }

    // Check if user is on waiting list
    if (event.waitingList.includes(req.user._id)) {
      // Remove from waiting list and add to participants
      event.waitingList = event.waitingList.filter(id => !id.equals(req.user._id));
    }

    // Add user to participants
    event.participants.push(req.user._id);
    event.currentParticipants += 1;

    // If event was marked as completed but date hasn't passed, reopen it
    if (event.status === 'completed') {
      event.status = 'open';
    }

    // Status will be auto-updated to 'full' by pre-save hook if needed
    await event.save();

    // Add event to user's joined events
    await req.user.joinedEvents.push(event._id);
    await req.user.save();

    return successResponse(res, event, 'Successfully joined the event');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const leaveEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user._id) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const event = await Event.findById(id);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Check if user is a participant
    if (!event.participants.includes(req.user._id)) {
      return errorResponse(res, 'You are not a participant of this event', 400);
    }

    // Remove user from participants
    event.participants = event.participants.filter(participantId => !participantId.equals(req.user._id));
    event.currentParticipants = Math.max(0, event.currentParticipants - 1);

    // Update status if event was full
    if (event.status === 'full') {
      event.status = 'open';
    }

    await event.save();

    // Remove event from user's joined events if the property exists
    if (req.user.joinedEvents) {
      await req.user.joinedEvents.pull(id);
      await req.user.save();
    }

    return successResponse(res, event, 'Successfully left the event');
  } catch (error: any) {
    console.error('Leave event error:', error);
    return errorResponse(res, error.message || 'Failed to leave event', 500);
  }
};

export const saveEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Check if event is already saved
    if (req.user.savedEvents.includes(id)) {
      // Unsave event
      await req.user.savedEvents.pull(id);
      await req.user.save();
      return successResponse(res, null, 'Event unsaved successfully');
    } else {
      // Save event
      await req.user.savedEvents.push(id);
      await req.user.save();
      return successResponse(res, null, 'Event saved successfully');
    }
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getMyEvents = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { type } = req.params; // 'hosted' or 'joined' or 'saved' or undefined for all
    const routePath = req.route.path; // Check which route was matched
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const statusFilter = (req.query.status as string) || '';

    let events;
    let query: any = {};

    if (type === 'hosted') {
      query.hostId = req.user._id;
    } else if (type === 'joined') {
      query._id = { $in: req.user.joinedEvents };
    } else if (type === 'saved') {
      query._id = { $in: req.user.savedEvents };
    } else if (!type) {
        // Check which route was matched
        if (routePath === '/hosted-events' || routePath === '/my-hosted') {
          query.hostId = req.user._id;
        } else if (routePath === '/my-joined') {
          query._id = { $in: req.user.joinedEvents };
        } else if (routePath === '/my-saved') {
          query._id = { $in: req.user.savedEvents };
        } else {
          // For /my-events route, get all events (hosted, joined, and saved)
          const allEventIds = [
            ...req.user.hostedEvents,
            ...req.user.joinedEvents,
            ...req.user.savedEvents
          ];
          query._id = { $in: allEventIds };
        }
    } else {
      return errorResponse(res, 'Invalid event type. Use hosted, joined, or saved', 400);
    }

      // Date-based status filter
      const now = new Date();
      if (statusFilter === 'upcoming') {
        query.date = { ...(query.date || {}), $gte: now };
      } else if (statusFilter === 'past') {
        query.date = { ...(query.date || {}), $lt: now };
      }

    const skip = (page - 1) * limit;

    events = await Event.find(query)
      .populate('hostId', 'fullName profileImage')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(query);

    return paginatedResponse(res, events, page, limit, total, 'My events retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getAllParticipants = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';

    const query: any = {};
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const participants = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    return paginatedResponse(res, participants, page, limit, total, 'All participants retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getEventParticipants = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Route param is defined as ":id" in event.routes.ts
    const { id: eventId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Only host or admin can view participants
    if (event.hostId.toString() !== req.user._id.toString() && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. Only event host can view participants', 403);
    }

    const query: any = { _id: { $in: event.participants } };
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const participants = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    return paginatedResponse(res, participants, page, limit, total, 'Event participants retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateEventStatus = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const eventId = Array.isArray(id) ? id[0] : id;
    const { status } = req.body;

    if (!Types.ObjectId.isValid(eventId)) {
      return errorResponse(res, 'Invalid event id', 400);
    }

    // Validate status
    const validStatuses = ['draft', 'open', 'full', 'cancelled', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Check if user is the host or admin
    if (event.hostId.toString() !== req.user._id.toString() && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. Only event host or admin can update event status', 403);
    }

    // Update status
    event.status = status;
    await event.save();

    const updatedEvent = await Event.findById(eventId)
      .populate('hostId', 'fullName profileImage');

    return successResponse(res, updatedEvent, 'Event status updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getEventRevenue = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const eventId = Array.isArray(id) ? id[0] : id;

    if (!Types.ObjectId.isValid(eventId)) {
      return errorResponse(res, 'Invalid event id', 400);
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Populate host details after finding event
    await event.populate('hostId', 'fullName email');

    if (!event.hostId) {
      return errorResponse(res, 'Event host not found', 404);
    }

    // Check if user is the host or admin
    if (event.hostId._id.toString() !== req.user._id.toString() && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. Only event host or admin can view event revenue', 403);
    }

    // Get payment statistics
    const [revenueSummary] = await Payment.aggregate([
      { $match: { eventId: new Types.ObjectId(eventId) } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'succeeded'] }, '$amount', 0]
            }
          },
          pendingRevenue: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'processing']] }, '$amount', 0]
            }
          },
          refundedRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'refunded'] }, '$refundAmount', 0]
            }
          },
          totalPayments: { $sum: 1 },
          succeededPayments: {
            $sum: {
              $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0]
            }
          },
          pendingPayments: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'processing']] }, 1, 0]
            }
          },
          failedPayments: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
            }
          },
          refundedPayments: {
            $sum: {
              $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get payment history
    const payments = await Payment.find({ eventId: id })
      .populate('userId', 'fullName email profileImage')
      .populate('bookingId', 'status bookingDate')
      .sort({ createdAt: -1 })
      .limit(50);

    return successResponse(
      res,
      {
        event: {
          _id: event._id,
          title: event.title,
          date: event.date,
          price: event.price,
          maxParticipants: event.maxParticipants,
          currentParticipants: event.currentParticipants,
          status: event.status,
          hostId: event.hostId
        },
        revenue: {
          totalRevenue: revenueSummary?.totalRevenue || 0,
          pendingRevenue: revenueSummary?.pendingRevenue || 0,
          refundedRevenue: revenueSummary?.refundedRevenue || 0,
          totalPayments: revenueSummary?.totalPayments || 0,
          succeededPayments: revenueSummary?.succeededPayments || 0,
          pendingPayments: revenueSummary?.pendingPayments || 0,
          failedPayments: revenueSummary?.failedPayments || 0,
          refundedPayments: revenueSummary?.refundedPayments || 0,
          averagePerParticipant: revenueSummary?.succeededPayments
            ? (revenueSummary.totalRevenue / revenueSummary.succeededPayments).toFixed(2)
            : 0
        },
        payments
      },
      'Event revenue retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getEventBookings = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const eventId = Array.isArray(id) ? id[0] : id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = Array.isArray(req.query.status) ? (req.query.status as string[])[0] : (req.query.status as string);

    if (!Types.ObjectId.isValid(eventId)) {
      return errorResponse(res, 'Invalid event id', 400);
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Check if user is the host or admin
    if (event.hostId.toString() !== req.user._id.toString() && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. Only event host or admin can view event bookings', 403);
    }

    // Import Booking model
    const { Booking } = require('../models/booking.model');

    // Build query
    const query: any = { eventId: id };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    // Get bookings
    const bookings = await Booking.find(query)
      .populate('userId', 'fullName email profileImage phone')
      .populate('eventId', 'title date price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(query);

    // Calculate booking statistics
    const eventObjectId = typeof id === 'string' ? new Types.ObjectId(id) : new Types.ObjectId(id[0]);
    const [stats] = await Booking.aggregate([
      { $match: { eventId: eventObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get summary
    const [summary] = await Booking.aggregate([
      { $match: { eventId: eventObjectId } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          confirmedBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0]
            }
          },
          pendingBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          cancelledBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
            }
          },
          completedBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    return successResponse(
      res,
      {
        event: {
          _id: event._id,
          title: event.title,
          date: event.date,
          maxParticipants: event.maxParticipants,
          currentParticipants: event.currentParticipants
        },
        summary: {
          totalBookings: summary?.totalBookings || 0,
          totalRevenue: summary?.totalRevenue || 0,
          confirmedBookings: summary?.confirmedBookings || 0,
          pendingBookings: summary?.pendingBookings || 0,
          cancelledBookings: summary?.cancelledBookings || 0,
          completedBookings: summary?.completedBookings || 0,
          totalQuantity: summary?.totalQuantity || 0
        },
        bookings,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      },
      'Event bookings retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};