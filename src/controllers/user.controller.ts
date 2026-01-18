import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Event } from '../models/event.model';
import { Booking } from '../models/booking.model';
import { Payment } from '../models/payment.model';
import { Review } from '../models/review.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';
import { uploadImage } from '../services/cloudinary.service';
import { comparePassword, hashPassword } from '../utils/hash';

export const getUsers = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const role = req.query.role as string;
    const city = req.query.city as string;

    const query: any = {};
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('hostedEvents', 'title date location')
      .populate('joinedEvents', 'title date location');

    const total = await User.countDocuments(query);

    return paginatedResponse(res, users, page, limit, total, 'Users retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const authenticatedUserId = req.user?._id?.toString();
    const userRole = req.user?.role;
    
    const user = await User.findById(id)
      .select('-password')
      .populate('hostedEvents', 'title date location price status')
      .populate('joinedEvents', 'title date location price status')
      .populate('savedEvents', 'title date location price');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // If user is authenticated and not admin, check if they're accessing their own profile
    if (authenticatedUserId && userRole !== UserRole.ADMIN) {
      if (id !== authenticatedUserId) {
        return errorResponse(res, 'Access denied. You can only view your own profile.', 403);
      }
    }

    return successResponse(res, user, 'User retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getPublicUserProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id)
      .select('fullName profileImage bio interests location.city location.area averageRating totalReviews isVerified hostedEvents createdAt')
      .populate({
        path: 'hostedEvents',
        select: 'title date location price status images category',
        match: { status: 'published' }
      });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Calculate additional profile stats
    const profileStats = {
      totalHostedEvents: user.hostedEvents.length,
      memberSince: user.createdAt,
      isVerified: user.isVerified,
      rating: user.averageRating,
      totalReviews: user.totalReviews
    };

    const publicProfile = {
      _id: user._id,
      fullName: user.fullName,
      profileImage: user.profileImage,
      bio: user.bio,
      interests: user.interests,
      location: {
        city: user.location.city,
        area: user.location.area
      },
      stats: profileStats,
      hostedEvents: user.hostedEvents
    };

    return successResponse(res, publicProfile, 'Public user profile retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { fullName, bio, interests, location, role } = req.body;

    // Only admins can change roles
    if (role && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Only admins can change user roles', 403);
    }

    const updateData: any = {};
    
    if (fullName) updateData.fullName = fullName;
    if (bio) updateData.bio = bio;
    if (interests) updateData.interests = Array.isArray(interests) ? interests : JSON.parse(interests || '[]');
    
    // Handle location - can be JSON string or plain string
    if (location) {
      if (typeof location === 'object') {
        updateData.location = location;
      } else if (typeof location === 'string') {
        try {
          // Try parsing as JSON first
          updateData.location = JSON.parse(location);
        } catch (e) {
          // If not JSON, treat as plain "City, Country" string
          const [city, area] = location.split(',').map((s: string) => s.trim());
          updateData.location = {
            city: city || '',
            area: area || ''
          };
        }
      }
    }
    
    if (role && req.user.role === UserRole.ADMIN) updateData.role = role;

    // Handle file upload if present
    if (req.file) {
      const imageUrl = await uploadImage(req.file.buffer, 'profile-images');
      updateData.profileImage = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // Only admins can delete users
    if (req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Only admins can delete users', 403);
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User deleted successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const toggleUserVerification = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // Only admins can verify users
    if (req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Only admins can verify users', 403);
    }

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    user.isVerified = !user.isVerified;
    await user.save();

    return successResponse(res, user, `User ${user.isVerified ? 'verified' : 'unverified'} successfully`);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getTopHosts = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const topHosts = await User.find({ role: UserRole.HOST })
      .select('-password')
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(limit)
      .populate('hostedEvents', 'title date status');

    return successResponse(res, topHosts, 'Top hosts retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const uploadUserProfileImage = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // Check if user is uploading their own image or if admin is updating another user's image
    if (id !== req.user._id.toString() && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. You can only upload your own profile image.', 403);
    }

    if (!req.file) {
      return errorResponse(res, 'No image file provided', 400);
    }

    // Upload image to Cloudinary
    const imageUrl = await uploadImage(req.file.buffer, 'profile-images');

    // Update user profile image
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { profileImage: imageUrl },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, { profileImage: imageUrl, user: updatedUser }, 'Profile image uploaded successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const discoverUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const city = req.query.city as string;
    const interests = req.query.interests as string; // comma-separated interests
    const searchQuery = req.query.search as string;

    const query: any = { isActive: true };
    
    // Search by name
    if (searchQuery) {
      query.fullName = { $regex: searchQuery, $options: 'i' };
    }
    
    // Filter by city
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }
    
    // Filter by interests (match users who have at least one of the specified interests)
    if (interests) {
      const interestArray = interests.split(',').map(i => i.trim());
      query.interests = { $in: interestArray.map(i => new RegExp(i, 'i')) };
    }

    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('fullName profileImage bio interests location.city location.area averageRating totalReviews isVerified createdAt')
      .sort({ averageRating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    return paginatedResponse(res, users, page, limit, total, 'Users discovered successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getUserEvents = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string; // 'hosted', 'joined', 'saved', 'upcoming', 'past', or 'all'

    const skip = (page - 1) * limit;
    const now = new Date();

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    let events;
    let total;

    if (status === 'hosted') {
      // Get events hosted by the user
      events = await Event.find({ hostId: userId })
        .select('_id title description category type location.city eventDate image price')
        .sort({ eventDate: -1 })
        .skip(skip)
        .limit(limit);

      total = await Event.countDocuments({ hostId: userId });
    } else if (status === 'joined') {
      // Get events joined by the user
      events = await Event.find({ participants: userId })
        .select('_id title description category type location.city eventDate image price')
        .sort({ eventDate: -1 })
        .skip(skip)
        .limit(limit);

      total = await Event.countDocuments({ participants: userId });
    } else if (status === 'saved') {
      // Get events saved/bookmarked by the user
      events = await Event.find({ savedBy: userId })
        .select('_id title description category type location.city eventDate image price')
        .sort({ eventDate: -1 })
        .skip(skip)
        .limit(limit);

      total = await Event.countDocuments({ savedBy: userId });
    } else if (status === 'upcoming') {
      // Get upcoming events (hosted + joined) with future dates
      events = await Event.find({
        eventDate: { $gte: now },
        $or: [
          { hostId: userId },
          { participants: userId }
        ]
      })
        .select('_id title description category type location.city eventDate image price hostId')
        .sort({ eventDate: 1 })
        .skip(skip)
        .limit(limit);

      total = await Event.countDocuments({
        eventDate: { $gte: now },
        $or: [
          { hostId: userId },
          { participants: userId }
        ]
      });
    } else if (status === 'past') {
      // Get past events (hosted + joined) with past dates
      events = await Event.find({
        eventDate: { $lt: now },
        $or: [
          { hostId: userId },
          { participants: userId }
        ]
      })
        .select('_id title description category type location.city eventDate image price hostId')
        .sort({ eventDate: -1 })
        .skip(skip)
        .limit(limit);

      total = await Event.countDocuments({
        eventDate: { $lt: now },
        $or: [
          { hostId: userId },
          { participants: userId }
        ]
      });
    } else {
      // Get all events (hosted + joined + saved) with aggregation
      const hostedCount = await Event.countDocuments({ hostId: userId });
      const joinedCount = await Event.countDocuments({ participants: userId });
      const savedCount = await Event.countDocuments({ savedBy: userId });

      const allEvents = await Event.aggregate([
        {
          $facet: {
            hosted: [
              { $match: { hostId: new (require('mongoose').Types.ObjectId)(userId) } },
              { $sort: { eventDate: -1 } },
              { $skip: skip },
              { $limit: limit },
              { $project: { title: 1, description: 1, category: 1, type: 1, 'location.city': 1, eventDate: 1, image: 1, price: 1, _id: 1 } }
            ],
            joined: [
              { $match: { participants: new (require('mongoose').Types.ObjectId)(userId) } },
              { $sort: { eventDate: -1 } },
              { $skip: skip },
              { $limit: limit },
              { $project: { title: 1, description: 1, category: 1, type: 1, 'location.city': 1, eventDate: 1, image: 1, price: 1, _id: 1 } }
            ],
            saved: [
              { $match: { savedBy: new (require('mongoose').Types.ObjectId)(userId) } },
              { $sort: { eventDate: -1 } },
              { $skip: skip },
              { $limit: limit },
              { $project: { title: 1, description: 1, category: 1, type: 1, 'location.city': 1, eventDate: 1, image: 1, price: 1, _id: 1 } }
            ]
          }
        }
      ]);

      return paginatedResponse(res, {
        hosted: allEvents[0].hosted,
        joined: allEvents[0].joined,
        saved: allEvents[0].saved,
        summary: { hostedCount, joinedCount, savedCount }
      } as any, page, limit, hostedCount + joinedCount + savedCount, 'User events retrieved successfully');
    }

    return paginatedResponse(res, events, page, limit, total, 'User events retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Verify authenticated user is changing their own password or is admin
    if (req.user?._id?.toString() !== userId && req.user?.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Unauthorized to change this password', 403);
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters', 400);
    }

    // Get user with password field
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Current password is incorrect', 401);
    }

    // Check if new password is same as current
    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      return errorResponse(res, 'New password must be different from current password', 400);
    }

    // Hash and update password
    user.password = await hashPassword(newPassword);
    await user.save();

    return successResponse(res, null, 'Password changed successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getUserDashboard = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Get user profile
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Event statistics
    const hostedEventsCount = await Event.countDocuments({ hostId: userId });
    const joinedEventsCount = await Event.countDocuments({ participants: userId });
    const savedEventsCount = user.savedEvents.length;

    // Upcoming events (both hosted and joined)
    const upcomingEvents = await Event.find({
      date: { $gte: now },
      $or: [
        { hostId: userId },
        { participants: userId }
      ]
    })
      .select('title date location price status hostId')
      .sort({ date: 1 })
      .limit(5)
      .populate('hostId', 'fullName profileImage');

    // Recent bookings
    const recentBookings = await Booking.find({ userId })
      .select('eventId amount status paymentStatus bookingDate')
      .sort({ bookingDate: -1 })
      .limit(5)
      .populate('eventId', 'title date location price');

    // Payment summary
    const totalSpent = await Payment.aggregate([
      { $match: { userId, status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Reviews received (if host)
    let reviewStats = null;
    if (user.role === UserRole.HOST || user.role === UserRole.ADMIN) {
      const reviews = await Review.find({ hostId: userId })
        .select('rating createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'fullName profileImage');

      reviewStats = {
        averageRating: user.averageRating,
        totalReviews: user.totalReviews,
        recentReviews: reviews
      };
    }

    // Host earnings (if host)
    let earningsStats = null;
    if (user.role === UserRole.HOST || user.role === UserRole.ADMIN) {
      const earnings = await Payment.aggregate([
        { $match: { hostId: userId, status: 'succeeded' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]);

      const pendingPayments = await Payment.countDocuments({
        hostId: userId,
        status: { $in: ['pending', 'processing'] }
      });

      earningsStats = {
        totalEarned: earnings[0]?.total || 0,
        totalTransactions: earnings[0]?.count || 0,
        pendingPayments
      };
    }

    const dashboardData = {
      profile: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        bio: user.bio,
        location: user.location,
        isVerified: user.isVerified,
        memberSince: user.createdAt
      },
      statistics: {
        hostedEvents: hostedEventsCount,
        joinedEvents: joinedEventsCount,
        savedEvents: savedEventsCount,
        totalSpent: totalSpent[0]?.total || 0
      },
      upcomingEvents,
      recentBookings,
      reviewStats,
      earningsStats
    };

    return successResponse(res, dashboardData, 'Dashboard data retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getUserDetails = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?._id?.toString();
    const requestingUserRole = req.user?.role;

    // Get user
    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpire');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check access permissions
    const isOwnProfile = userId === requestingUserId;
    const isAdmin = requestingUserRole === UserRole.ADMIN;

    // Basic user info (available to all authenticated users)
    const userDetails: any = {
      _id: user._id,
      fullName: user.fullName,
      profileImage: user.profileImage,
      bio: user.bio,
      interests: user.interests,
      location: user.location,
      isVerified: user.isVerified,
      averageRating: user.averageRating,
      totalReviews: user.totalReviews,
      role: user.role,
      createdAt: user.createdAt
    };

    // Add sensitive info only for own profile or admin
    if (isOwnProfile || isAdmin) {
      userDetails.email = user.email;
      userDetails.isActive = user.isActive;
      userDetails.userStatus = user.userStatus;
      userDetails.suspensionReason = user.suspensionReason;
      userDetails.stripeAccountId = user.stripeAccountId;
      userDetails.updatedAt = user.updatedAt;
    }

    // Get events statistics
    const hostedEventsCount = await Event.countDocuments({ hostId: userId });
    const joinedEventsCount = await Event.countDocuments({ participants: userId });
    
    // Get hosted events
    const hostedEvents = await Event.find({ hostId: userId })
      .select('title date location price status category images capacity attendees')
      .sort({ date: -1 })
      .limit(10);

    // Get joined events (only for own profile or admin)
    let joinedEvents: any[] = [];
    if (isOwnProfile || isAdmin) {
      joinedEvents = await Event.find({ participants: userId })
        .select('title date location price status category images')
        .sort({ date: -1 })
        .limit(10)
        .populate('hostId', 'fullName profileImage');
    }

    // Get bookings statistics (only for own profile or admin)
    let bookingStats = null;
    if (isOwnProfile || isAdmin) {
      const [stats] = await Booking.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
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
            },
            totalSpent: { $sum: '$amount' }
          }
        }
      ]);

      bookingStats = {
        total: stats?.totalBookings || 0,
        confirmed: stats?.confirmedBookings || 0,
        pending: stats?.pendingBookings || 0,
        cancelled: stats?.cancelledBookings || 0,
        completed: stats?.completedBookings || 0,
        totalSpent: stats?.totalSpent || 0
      };
    }

    // Get reviews given by user (only for own profile or admin)
    let reviewsGiven: any[] = [];
    if (isOwnProfile || isAdmin) {
      reviewsGiven = await Review.find({ userId })
        .select('rating comment createdAt eventId hostId')
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('eventId', 'title date')
        .populate('hostId', 'fullName profileImage');
    }

    // Get reviews received (if user is a host)
    let reviewsReceived: any[] = [];
    let ratingDistribution = null;
    if (user.role === UserRole.HOST || user.role === UserRole.ADMIN) {
      reviewsReceived = await Review.find({ hostId: userId })
        .select('rating comment createdAt userId eventId')
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'fullName profileImage')
        .populate('eventId', 'title date');

      // Get rating distribution
      const [ratingStats] = await Review.aggregate([
        { $match: { hostId: user._id } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
          }
        }
      ]);

      const totalReviews = ratingStats?.totalReviews || 0;
      ratingDistribution = {
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
    }

    // Get earnings statistics (only for own profile or admin, and if user is host)
    let earningsStats = null;
    if ((isOwnProfile || isAdmin) && (user.role === UserRole.HOST || user.role === UserRole.ADMIN)) {
      const [earnings] = await Payment.aggregate([
        { $match: { hostId: user._id, status: 'succeeded' } },
        {
          $group: {
            _id: null,
            totalEarned: { $sum: '$amount' },
            totalTransactions: { $sum: 1 }
          }
        }
      ]);

      const [pendingEarnings] = await Payment.aggregate([
        { $match: { hostId: user._id, status: { $in: ['pending', 'processing'] } } },
        {
          $group: {
            _id: null,
            pendingAmount: { $sum: '$amount' },
            pendingCount: { $sum: 1 }
          }
        }
      ]);

      earningsStats = {
        totalEarned: earnings?.totalEarned || 0,
        totalTransactions: earnings?.totalTransactions || 0,
        pendingAmount: pendingEarnings?.pendingAmount || 0,
        pendingTransactions: pendingEarnings?.pendingCount || 0
      };
    }

    // Build response
    const response: any = {
      user: userDetails,
      events: {
        hosted: {
          count: hostedEventsCount,
          items: hostedEvents
        },
        joined: {
          count: joinedEventsCount,
          items: joinedEvents
        }
      },
      ratings: {
        averageRating: user.averageRating,
        totalReviews: user.totalReviews,
        distribution: ratingDistribution,
        reviewsReceived: reviewsReceived,
        reviewsGiven: reviewsGiven
      }
    };

    // Add booking stats if available
    if (bookingStats) {
      response.bookings = bookingStats;
    }

    // Add earnings stats if available
    if (earningsStats) {
      response.earnings = earningsStats;
    }

    return successResponse(res, response, 'User details retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};