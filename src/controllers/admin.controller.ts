import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Event } from '../models/event.model';
import { Review } from '../models/review.model';
import { successResponse, errorResponse } from '../utils/response';

export const getAllUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return successResponse(res, users, 'Users retrieved successfully');
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
    const events = await Event.find()
      .populate('hostId', 'name email')
      .sort({ createdAt: -1 });

    return successResponse(res, events, 'Events retrieved successfully');
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