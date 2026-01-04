import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Event } from '../models/event.model';
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
      }, page, limit, hostedCount + joinedCount + savedCount, 'User events retrieved successfully');
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
    if (req.user?.id !== userId && req.user?.role !== UserRole.ADMIN) {
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