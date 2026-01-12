import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Event } from '../models/event.model';
import { Review } from '../models/review.model';
import { Payment } from '../models/payment.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';

export const getAllUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const { search, role, isActive, isVerified, page = 1, limit = 20 } = req.query;
    
    // Build query filter
    const filter: any = {};
    
    // Search by name or email
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by role
    if (role) {
      filter.role = role;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // Filter by verified status
    if (isVerified !== undefined) {
      filter.isVerified = isVerified === 'true';
    }
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await User.countDocuments(filter);
    
    return successResponse(
      res, 
      { 
        users, 
        pagination: { 
          total, 
          page: pageNum, 
          limit: limitNum, 
          pages: Math.ceil(total / limitNum) 
        } 
      }, 
      'Users retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getUserByIdAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getUserActivity = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Get hosted events
    const hostedEvents = await Event.find({ hostId: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title category date status attendees createdAt');

    // Get joined/attended events
    const joinedEvents = await Event.find({ 'attendees.userId': userId })
      .sort({ date: -1 })
      .limit(10)
      .select('title category date status attendees');

    // Get bookings made by user
    const { Booking } = require('../models/booking.model');
    const bookings = await Booking.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('eventId', 'title date category');

    // Get reviews given by user
    const reviewsGiven = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('eventId', 'title category');

    // Get reviews received (for events hosted by user)
    const hostedEventIds = hostedEvents.map(e => e._id);
    const reviewsReceived = await Review.find({ eventId: { $in: hostedEventIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('eventId', 'title category')
      .populate('userId', 'fullName profileImage');

    // Calculate statistics
    const stats = {
      totalHostedEvents: await Event.countDocuments({ hostId: userId }),
      totalJoinedEvents: await Event.countDocuments({ 'attendees.userId': userId }),
      totalBookings: await Booking.countDocuments({ userId }),
      totalReviewsGiven: await Review.countDocuments({ userId }),
      totalReviewsReceived: await Review.countDocuments({ eventId: { $in: hostedEventIds } })
    };

    return successResponse(
      res,
      {
        user,
        stats,
        hostedEvents,
        joinedEvents,
        bookings,
        reviewsGiven,
        reviewsReceived
      },
      'User activity retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User role updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateUserStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const { status, isActive, isVerified, reason } = req.body;

    const updateData: any = {};
    
    // Handle new status field (suspended, active, etc.)
    if (status) {
      const validStatuses = ['active', 'suspended', 'banned', 'inactive'];
      if (!validStatuses.includes(status)) {
        return errorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      }
      
      // Map status to isActive
      if (status === 'active' || status === 'inactive') {
        updateData.isActive = status === 'active';
      } else if (status === 'suspended' || status === 'banned') {
        updateData.isActive = false;
      }
      
      // Store the actual status and reason
      updateData.userStatus = status;
      if (reason) {
        updateData.suspensionReason = reason;
      }
    }
    
    // Handle legacy fields
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    if (isVerified !== undefined) {
      updateData.isVerified = isVerified;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse(res, 'No status fields provided', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User status updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const verifyUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const { isVerified = true } = req.body;

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    user.isVerified = typeof isVerified === 'boolean' ? isVerified : true;
    await user.save();

    return successResponse(
      res,
      user,
      `User ${user.isVerified ? 'verified' : 'unverified'} successfully`
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    await Event.deleteMany({ hostId: userId });

    return successResponse(res, null, 'User deleted successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const banUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, `User banned successfully${reason ? ': ' + reason : ''}`);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const unbanUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User unbanned successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getAllEventsAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { search, category, type, status, hostId, page = 1, limit = 20 } = req.query;
    
    // Build query filter
    const filter: any = {};
    
    // Search by title or description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by category
    if (category) {
      filter.category = category;
    }
    
    // Filter by type
    if (type) {
      filter.type = type;
    }
    
    // Filter by status
    if (status) {
      filter.status = status;
    }
    
    // Filter by host
    if (hostId) {
      filter.hostId = hostId;
    }
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const events = await Event.find(filter)
      .populate('hostId', 'fullName email profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Event.countDocuments(filter);

    return successResponse(
      res,
      {
        events,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      },
      'Events retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getEventByIdAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findById(eventId)
      .populate('hostId', 'fullName email profileImage role averageRating')
      .populate('participants', 'fullName email profileImage')
      .populate('waitingList', 'fullName email profileImage');
    
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Get additional stats
    const { Booking } = require('../models/booking.model');
    const bookingStats = await Booking.aggregate([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const reviews = await Review.find({ eventId })
      .populate('userId', 'fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(10);

    const reviewStats = {
      total: await Review.countDocuments({ eventId }),
      averageRating: event.averageRating || 0
    };

    return successResponse(
      res,
      {
        event,
        bookingStats,
        reviews,
        reviewStats
      },
      'Event retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateEventAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { eventId } = req.params;
    const updateData = req.body;

    // Admin can update any field
    const event = await Event.findByIdAndUpdate(
      eventId,
      updateData,
      { new: true, runValidators: true }
    ).populate('hostId', 'fullName email profileImage');

    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    return successResponse(res, event, 'Event updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateEventStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    const event = await Event.findByIdAndUpdate(
      eventId,
      { status },
      { new: true }
    );

    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    return successResponse(res, event, 'Event status updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const deleteEventAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findByIdAndDelete(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    return successResponse(res, null, 'Event deleted successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getAllBookingsAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId, eventId, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    // Import Booking model
    const { Booking } = require('../models/booking.model');
    
    // Build query filter
    const filter: any = {};
    
    // Filter by userId
    if (userId) {
      filter.userId = userId;
    }
    
    // Filter by eventId
    if (eventId) {
      filter.eventId = eventId;
    }
    
    // Filter by status
    if (status) {
      filter.status = status;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate as string);
      }
    }
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const bookings = await Booking.find(filter)
      .populate('userId', 'fullName email profileImage')
      .populate('eventId', 'title category date price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Booking.countDocuments(filter);
    
    // Calculate summary statistics
    const stats = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    return successResponse(
      res,
      {
        bookings,
        stats,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      },
      'Bookings retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getDashboardStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const totalUsers = await User.countDocuments();
    const totalEvents = await Event.countDocuments();
    const activeEvents = await Event.countDocuments({ status: 'open' });
    const completedEvents = await Event.countDocuments({ status: 'completed' });
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const bannedUsers = await User.countDocuments({ isActive: false });

    return successResponse(
      res,
      {
        totalUsers,
        verifiedUsers,
        bannedUsers,
        totalEvents,
        activeEvents,
        completedEvents
      },
      'Dashboard stats retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

// Content Moderation Functions
export const getAllReviews = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find()
      .populate('userId', 'name email')
      .populate('hostId', 'name email')
      .populate('eventId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments();

    return successResponse(
      res,
      { reviews, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
      'Reviews retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const deleteReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    return successResponse(
      res,
      null,
      `Review deleted successfully${reason ? ': ' + reason : ''}`
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const moderateReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const { reviewId } = req.params;
    const { action, reason } = req.body;

    if (!action) {
      return errorResponse(res, 'Action is required', 400);
    }

    const review = await Review.findById(reviewId)
      .populate('userId', 'fullName email')
      .populate('hostId', 'fullName email')
      .populate('eventId', 'title');

    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    let result;
    let message;

    switch (action) {
      case 'approve':
        // Approve the review (if you have an approval status field)
        message = 'Review approved successfully';
        result = review;
        break;
      
      case 'reject':
      case 'delete':
        // Delete the review
        await Review.findByIdAndDelete(reviewId);
        message = `Review ${action === 'reject' ? 'rejected' : 'deleted'} successfully${reason ? ': ' + reason : ''}`;
        result = null;
        break;
      
      case 'flag':
        // Flag the review as inappropriate
        message = `Review flagged successfully${reason ? ': ' + reason : ''}`;
        result = review;
        break;
      
      default:
        return errorResponse(res, 'Invalid action. Use: approve, reject, delete, or flag', 400);
    }

    return successResponse(res, result, message);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getHostsForModeration = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const hosts = await User.find({ role: 'host' })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ role: 'host' });

    const hostsWithStats = await Promise.all(
      hosts.map(async (host) => {
        const eventCount = await Event.countDocuments({ hostId: host._id });
        const avgRating = await Review.aggregate([
          { $match: { hostId: host._id } },
          { $group: { _id: null, avg: { $avg: '$rating' } } }
        ]);

        return {
          ...host.toObject(),
          eventCount,
          avgRating: avgRating[0]?.avg || 0
        };
      })
    );

    return successResponse(
      res,
      { hosts: hostsWithStats, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
      'Hosts retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const approveHost = async (req: Request, res: Response): Promise<any> => {
  try {
    const { hostId } = req.params;

    const host = await User.findByIdAndUpdate(
      hostId,
      { isVerified: true },
      { new: true }
    ).select('-password');

    if (!host) {
      return errorResponse(res, 'Host not found', 404);
    }

    return successResponse(res, host, 'Host approved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const rejectHost = async (req: Request, res: Response): Promise<any> => {
  try {
    const { hostId } = req.params;
    const { reason } = req.body;

    const host = await User.findByIdAndUpdate(
      hostId,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!host) {
      return errorResponse(res, 'Host not found', 404);
    }

    return successResponse(
      res,
      host,
      `Host rejected successfully${reason ? ': ' + reason : ''}`
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getReportedEvents = async (req: Request, res: Response): Promise<any> => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Find flagged/reported events
    const events = await Event.find({ 'metadata.flagged': true })
      .populate('hostId', 'fullName email profileImage')
      .sort({ 'metadata.flaggedAt': -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Event.countDocuments({ 'metadata.flagged': true });
    
    return successResponse(
      res,
      {
        events,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      },
      'Reported events retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const flagEvent = async (req: Request, res: Response): Promise<any> => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Add flagged metadata
    const flaggedEvent = await Event.findByIdAndUpdate(
      eventId,
      {
        $set: {
          'metadata.flagged': true,
          'metadata.flagReason': reason || 'Content violation',
          'metadata.flaggedAt': new Date(),
          'metadata.flaggedBy': req.user?.id
        }
      },
      { new: true }
    );

    return successResponse(res, flaggedEvent, 'Event flagged successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getFlaggedContent = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const flaggedEvents = await Event.find({
      'metadata.flagged': true
    })
      .populate('hostId', 'name email')
      .sort({ 'metadata.flaggedAt': -1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments({ 'metadata.flagged': true });

    return successResponse(
      res,
      { events: flaggedEvents, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
      'Flagged content retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const resolveFlaggedContent = async (req: Request, res: Response): Promise<any> => {
  try {
    const { eventId } = req.params;
    const { action } = req.body; // 'approve' or 'delete'

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    if (action === 'approve') {
      const resolvedEvent = await Event.findByIdAndUpdate(
        eventId,
        {
          $unset: { 'metadata.flagged': '', 'metadata.flagReason': '', 'metadata.flaggedAt': '', 'metadata.flaggedBy': '' }
        },
        { new: true }
      );
      return successResponse(res, resolvedEvent, 'Content flagging removed');
    } else if (action === 'delete') {
      await Event.findByIdAndDelete(eventId);
      return successResponse(res, null, 'Content deleted successfully');
    } else {
      return errorResponse(res, 'Invalid action', 400);
    }
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getUserAnalytics = async (req: Request, res: Response): Promise<any> => {
  try {
    const { period = '30days' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get user statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    const activeUsers = await User.countDocuments({ isActive: true });
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get daily user registrations for the period
    const dailyRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top users by hosted events
    const topHosts = await User.aggregate([
      {
        $project: {
          fullName: 1,
          email: 1,
          hostedEventsCount: { $size: { $ifNull: ['$hostedEvents', []] } },
          averageRating: 1
        }
      },
      { $sort: { hostedEventsCount: -1 } },
      { $limit: 10 }
    ]);

    return successResponse(
      res,
      {
        period,
        totalUsers,
        newUsers,
        activeUsers,
        verifiedUsers,
        usersByRole,
        dailyRegistrations,
        topHosts
      },
      'User analytics retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getEventAnalytics = async (req: Request, res: Response): Promise<any> => {
  try {
    const { period = '30days' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get event statistics
    const totalEvents = await Event.countDocuments();
    const newEvents = await Event.countDocuments({ createdAt: { $gte: startDate } });
    const upcomingEvents = await Event.countDocuments({ date: { $gte: now } });
    const pastEvents = await Event.countDocuments({ date: { $lt: now } });
    
    const eventsByCategory = await Event.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const eventsByStatus = await Event.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Daily event creations
    const dailyEventCreations = await Event.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top rated events
    const topRatedEvents = await Event.find()
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(10)
      .select('title averageRating totalReviews category price');

    // Most popular events by attendees
    const popularEvents = await Event.aggregate([
      {
        $project: {
          title: 1,
          category: 1,
          attendeesCount: { $size: { $ifNull: ['$attendees', []] } },
          maxAttendees: 1
        }
      },
      { $sort: { attendeesCount: -1 } },
      { $limit: 10 }
    ]);

    return successResponse(
      res,
      {
        period,
        totalEvents,
        newEvents,
        upcomingEvents,
        pastEvents,
        eventsByCategory,
        eventsByStatus,
        dailyEventCreations,
        topRatedEvents,
        popularEvents
      },
      'Event analytics retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getRevenueAnalytics = async (req: Request, res: Response): Promise<any> => {
  try {
    const { period = '30days' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Import Booking model dynamically if not already imported
    const { Booking } = require('../models/booking.model');

    // Total revenue from bookings
    const revenueData = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$amount' }
        }
      }
    ]);

    // Daily revenue
    const dailyRevenue = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Revenue by event category
    const revenueByCategory = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $group: {
          _id: '$event.category',
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Top revenue generating events
    const topRevenueEvents = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: '$eventId',
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $project: {
          eventId: '$_id',
          eventTitle: '$event.title',
          category: '$event.category',
          revenue: 1,
          bookings: 1
        }
      }
    ]);

    return successResponse(
      res,
      {
        period,
        summary: revenueData[0] || { totalRevenue: 0, totalBookings: 0, averageBookingValue: 0 },
        dailyRevenue,
        revenueByCategory,
        topRevenueEvents
      },
      'Revenue analytics retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const processRefund = async (req: Request, res: Response): Promise<any> => {
  try {
    const { bookingId, reason } = req.body;

    if (!bookingId) {
      return errorResponse(res, 'Booking ID is required', 400);
    }

    const { Booking } = require('../models/booking.model');
    const { Payment } = require('../models/payment.model');

    // Find booking
    const booking = await Booking.findById(bookingId).populate('eventId userId');
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.status === 'refunded') {
      return errorResponse(res, 'Booking already refunded', 400);
    }

    // Find associated payment
    const payment = await Payment.findOne({ bookingId });
    if (!payment) {
      return errorResponse(res, 'Payment record not found', 404);
    }

    // Update booking status
    booking.status = 'refunded';
    await booking.save();

    // Update payment status
    payment.status = 'refunded';
    payment.refundReason = reason || 'Admin refund';
    payment.refundedAt = new Date();
    await payment.save();

    return successResponse(
      res,
      {
        booking,
        payment,
        refundAmount: booking.amount,
        refundedAt: payment.refundedAt
      },
      'Refund processed successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getRefundHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId, eventId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const { Booking } = require('../models/booking.model');

    // Build filter
    const filter: any = { status: 'refunded' };

    if (userId) {
      filter.userId = userId;
    }

    if (eventId) {
      filter.eventId = eventId;
    }

    if (startDate || endDate) {
      filter.updatedAt = {};
      if (startDate) {
        filter.updatedAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.updatedAt.$lte = new Date(endDate as string);
      }
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const refunds = await Booking.find(filter)
      .populate('userId', 'fullName email profileImage')
      .populate('eventId', 'title category price')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Booking.countDocuments(filter);

    // Calculate refund summary
    const summary = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: '$amount' },
          refundCount: { $sum: 1 }
        }
      }
    ]);

    return successResponse(
      res,
      {
        refunds,
        summary: summary[0] || { totalRefunded: 0, refundCount: 0 },
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      },
      'Refund history retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getRevenueSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const { Booking } = require('../models/booking.model');

    // Get overall revenue summary
    const revenueSummary = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$amount' },
          minBookingValue: { $min: '$amount' },
          maxBookingValue: { $max: '$amount' }
        }
      }
    ]);

    // Revenue by booking status
    const revenueByStatus = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    // Revenue by event category
    const revenueByCategory = await Booking.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $group: {
          _id: '$event.category',
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Top earning events
    const topEarningEvents = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: '$eventId',
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $project: {
          eventId: '$_id',
          eventTitle: '$event.title',
          category: '$event.category',
          revenue: 1,
          bookings: 1
        }
      }
    ]);

    // Top earning hosts
    const topEarningHosts = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $group: {
          _id: '$event.hostId',
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'host'
        }
      },
      { $unwind: '$host' },
      {
        $project: {
          hostId: '$_id',
          hostName: '$host.fullName',
          hostEmail: '$host.email',
          revenue: 1,
          bookings: 1
        }
      }
    ]);

    // Monthly revenue trend
    const monthlyRevenue = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 12 }
    ]);

    // Refund summary
    const refundSummary = await Booking.aggregate([
      { $match: { status: 'refunded' } },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: '$amount' },
          refundCount: { $sum: 1 }
        }
      }
    ]);

    return successResponse(
      res,
      {
        summary: revenueSummary[0] || {
          totalRevenue: 0,
          totalBookings: 0,
          averageBookingValue: 0,
          minBookingValue: 0,
          maxBookingValue: 0
        },
        byStatus: revenueByStatus,
        byCategory: revenueByCategory,
        topEarningEvents,
        topEarningHosts,
        monthlyTrend: monthlyRevenue.reverse(),
        refunds: refundSummary[0] || { totalRefunded: 0, refundCount: 0 }
      },
      'Revenue summary retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getHostEarnings = async (req: Request, res: Response): Promise<any> => {
  try {
    const { hostId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    // Verify host exists
    const host = await User.findById(hostId);
    if (!host) {
      return errorResponse(res, 'Host not found', 404);
    }

    // Build query
    const query: any = { hostId };

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    // Get payments
    const payments = await Payment.find(query)
      .populate('eventId', 'title date category')
      .populate('bookingId', 'status paymentStatus bookingDate')
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments(query);

    // Calculate earnings summary
    const [summary] = await Payment.aggregate([
      { $match: { hostId: host._id } },
      {
        $group: {
          _id: null,
          totalEarned: {
            $sum: {
              $cond: [{ $eq: ['$status', 'succeeded'] }, '$amount', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'processing']] }, '$amount', 0]
            }
          },
          refundedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'refunded'] }, '$refundAmount', 0]
            }
          },
          totalPayments: { $sum: 1 },
          succeededCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'processing']] }, 1, 0]
            }
          },
          refundedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Last 30 days earnings
    const [last30Days] = await Payment.aggregate([
      {
        $match: {
          hostId: host._id,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          status: 'succeeded'
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return successResponse(
      res,
      {
        host: {
          _id: host._id,
          fullName: host.fullName,
          email: host.email,
          profileImage: host.profileImage
        },
        summary: {
          totalEarned: summary?.totalEarned || 0,
          pendingAmount: summary?.pendingAmount || 0,
          refundedAmount: summary?.refundedAmount || 0,
          totalPayments: summary?.totalPayments || 0,
          succeededCount: summary?.succeededCount || 0,
          pendingCount: summary?.pendingCount || 0,
          refundedCount: summary?.refundedCount || 0,
          last30Days: {
            amount: last30Days?.amount || 0,
            count: last30Days?.count || 0
          }
        },
        payments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      },
      'Host earnings retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};