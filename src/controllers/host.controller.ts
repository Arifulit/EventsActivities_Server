import { Response } from 'express';
import { Types } from 'mongoose';
import { Event } from '../models/event.model';
import { User } from '../models/user.model';
import { Review } from '../models/review.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

export const getHostBookings = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const eventId = req.query.eventId as string;
    const userId = req.query.userId as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    // Import Booking model
    const { Booking } = require('../models/booking.model');

    // Get all events hosted by this user
    const hostedEvents = await Event.find({ hostId: req.user._id }).select('_id');
    const eventIds = hostedEvents.map(event => event._id);

    if (eventIds.length === 0) {
      return successResponse(
        res,
        {
          bookings: [],
          summary: {
            totalBookings: 0,
            totalRevenue: 0,
            confirmedBookings: 0,
            pendingBookings: 0,
            cancelledBookings: 0,
            completedBookings: 0
          },
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0
          }
        },
        'No events hosted by this user'
      );
    }

    // Build query
    const query: any = { eventId: { $in: eventIds } };

    if (status) {
      query.status = status;
    }

    if (eventId) {
      query.eventId = eventId;
    }

    if (userId) {
      query.userId = userId;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    // Get bookings
    const bookings = await Booking.find(query)
      .populate('userId', 'fullName email profileImage phone')
      .populate('eventId', 'title date price category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(query);

    // Get summary
    const [summary] = await Booking.aggregate([
      { $match: { eventId: { $in: eventIds.map(id => new Types.ObjectId(id)) } } },
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
          }
        }
      }
    ]);

    return successResponse(
      res,
      {
        bookings,
        summary: {
          totalBookings: summary?.totalBookings || 0,
          totalRevenue: summary?.totalRevenue || 0,
          confirmedBookings: summary?.confirmedBookings || 0,
          pendingBookings: summary?.pendingBookings || 0,
          cancelledBookings: summary?.cancelledBookings || 0,
          completedBookings: summary?.completedBookings || 0
        },
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      },
      'Host bookings retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getHostStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Get all events hosted by this user
    const hostedEvents = await Event.find({ hostId: req.user._id });
    const eventIds = hostedEvents.map(event => event._id);

    // Import Booking model
    const { Booking } = require('../models/booking.model');
    const { Payment } = require('../models/payment.model');

    // Get booking stats
    const [bookingStats] = await Booking.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          pendingBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get payment stats
    const [paymentStats] = await Payment.aggregate([
      { $match: { hostId: req.user._id } },
      {
        $group: {
          _id: null,
          totalEarned: {
            $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, '$amount', 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'processing']] }, '$amount', 0] }
          },
          refundedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$refundAmount', 0] }
          },
          totalPayments: { $sum: 1 }
        }
      }
    ]);

    return successResponse(
      res,
      {
        events: {
          total: hostedEvents.length,
          active: hostedEvents.filter(e => e.status === 'open').length,
          completed: hostedEvents.filter(e => e.status === 'completed').length,
          cancelled: hostedEvents.filter(e => e.status === 'cancelled').length
        },
        bookings: {
          total: bookingStats?.totalBookings || 0,
          confirmed: bookingStats?.confirmedBookings || 0,
          pending: bookingStats?.pendingBookings || 0,
          cancelled: bookingStats?.cancelledBookings || 0,
          completed: bookingStats?.completedBookings || 0
        },
        earnings: {
          totalEarned: paymentStats?.totalEarned || 0,
          pendingAmount: paymentStats?.pendingAmount || 0,
          refundedAmount: paymentStats?.refundedAmount || 0,
          totalPayments: paymentStats?.totalPayments || 0
        }
      },
      'Host statistics retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getHostRatingStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { hostId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Verify host exists
    const host = await User.findById(hostId);
    if (!host) {
      return errorResponse(res, 'Host not found', 404);
    }

    // Get all reviews for this host
    const [ratingStats] = await Review.aggregate([
      { $match: { hostId: new Types.ObjectId(hostId) } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          rating5: {
            $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] }
          },
          rating4: {
            $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] }
          },
          rating3: {
            $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] }
          },
          rating2: {
            $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] }
          },
          rating1: {
            $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] }
          }
        }
      }
    ]);

    // Get recent reviews
    const skip = (page - 1) * limit;
    const reviews = await Review.find({ hostId })
      .populate('userId', 'fullName profileImage')
      .populate('eventId', 'title date')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ hostId });

    // Calculate percentages
    const totalReviews = ratingStats?.totalReviews || 0;
    const ratingDistribution = {
      5: {
        count: ratingStats?.rating5 || 0,
        percentage: totalReviews > 0 ? ((ratingStats?.rating5 || 0) / totalReviews * 100).toFixed(1) : '0.0'
      },
      4: {
        count: ratingStats?.rating4 || 0,
        percentage: totalReviews > 0 ? ((ratingStats?.rating4 || 0) / totalReviews * 100).toFixed(1) : '0.0'
      },
      3: {
        count: ratingStats?.rating3 || 0,
        percentage: totalReviews > 0 ? ((ratingStats?.rating3 || 0) / totalReviews * 100).toFixed(1) : '0.0'
      },
      2: {
        count: ratingStats?.rating2 || 0,
        percentage: totalReviews > 0 ? ((ratingStats?.rating2 || 0) / totalReviews * 100).toFixed(1) : '0.0'
      },
      1: {
        count: ratingStats?.rating1 || 0,
        percentage: totalReviews > 0 ? ((ratingStats?.rating1 || 0) / totalReviews * 100).toFixed(1) : '0.0'
      }
    };

    return successResponse(
      res,
      {
        host: {
          _id: host._id,
          fullName: host.fullName,
          email: host.email,
          profileImage: host.profileImage
        },
        stats: {
          totalReviews,
          averageRating: ratingStats?.averageRating ? parseFloat(ratingStats.averageRating.toFixed(2)) : 0,
          ratingDistribution
        },
        reviews,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      },
      'Host rating statistics retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};
