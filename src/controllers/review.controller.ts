import { Request, Response } from 'express';
import { Review } from '../models/review.model';
import { Event } from '../models/event.model';
import { User } from '../models/user.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';

export const createReview = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { eventId, rating, comment } = req.body;

    // Check if user has attended the event
    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Verify user was a participant
    if (!event.participants.includes(req.user._id)) {
      return errorResponse(res, 'You can only review events you have attended', 400);
    }

    // Temporarily allow reviews for all attended events for testing
    // TODO: Re-enable date/time validation after testing
    console.log('Event status:', event.status);
    console.log('Event date:', event.date);
    console.log('Event time:', event.time);
    
    // For now, just check if user is a participant (already checked above)
    // This allows testing of the review functionality

    // Check if user already reviewed this event
    const existingReview = await Review.findOne({
      userId: req.user._id,
      eventId: eventId
    });

    if (existingReview) {
      return errorResponse(res, 'You have already reviewed this event', 400);
    }

    // Create review
    const review = await Review.create({
      userId: req.user._id,
      hostId: event.hostId,
      eventId: eventId,
      rating,
      comment: comment || ''
    });

    // Update host's average rating
    await updateHostRating(event.hostId.toString());

    return successResponse(res, review, 'Review created successfully', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getReviews = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const eventId = req.params.eventId as string || (req.query.eventId as string);
    const hostId = req.query.hostId as string;
    const rating = req.query.rating as string;

    let query: any = {};

    if (eventId) {
      query.eventId = eventId;
    }

    if (hostId) {
      query.hostId = hostId;
    }

    if (rating) {
      query.rating = parseInt(rating);
    }

    const skip = (page - 1) * limit;

    const reviews = await Review.find(query)
      .populate('userId', 'fullName profileImage')
      .populate('hostId', 'fullName profileImage')
      .populate('eventId', 'title date')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(query);

    return paginatedResponse(res, reviews, page, limit, total, 'Reviews retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getReviewById = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate('userId', 'fullName profileImage')
      .populate('hostId', 'fullName profileImage')
      .populate('eventId', 'title date location');

    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    return successResponse(res, review, 'Review retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateReview = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    // Only review owner or admin can update
    if (review.userId.toString() !== req.user._id.toString() && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied', 403);
    }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { rating, comment },
      { new: true, runValidators: true }
    ).populate('userId', 'fullName')
      .populate('hostId', 'fullName')
      .populate('eventId', 'title');

    // Update host's average rating
    await updateHostRating(review.hostId.toString());

    return successResponse(res, updatedReview, 'Review updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    // Only review owner, host, or admin can delete
    if (
      review.userId.toString() !== req.user._id.toString() &&
      review.hostId.toString() !== req.user._id.toString() &&
      req.user.role !== UserRole.ADMIN
    ) {
      return errorResponse(res, 'Access denied', 403);
    }

    await Review.findByIdAndDelete(id);

    // Update host's average rating
    await updateHostRating(review.hostId.toString());

    return successResponse(res, review, 'Review deleted successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getHostReviews = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { hostId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const skip = (page - 1) * limit;

    const reviews = await Review.find({ hostId })
      .populate('userId', 'fullName profileImage')
      .populate('eventId', 'title date')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ hostId });

    return paginatedResponse(res, reviews, page, limit, total, 'Host reviews retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getMyReviews = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const skip = (page - 1) * limit;

    const reviews = await Review.find({ userId: req.user._id })
      .populate('hostId', 'fullName profileImage')
      .populate('eventId', 'title date location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ userId: req.user._id });

    return paginatedResponse(res, reviews, page, limit, total, 'My reviews retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

// Helper function to update host's average rating
const updateHostRating = async (hostId: string): Promise<void> => {
  try {
    const reviews = await Review.find({ hostId });
    
    if (reviews.length === 0) {
      await User.findByIdAndUpdate(hostId, {
        averageRating: 0,
        totalReviews: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await User.findByIdAndUpdate(hostId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('Error updating host rating:', error);
  }
};