import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Event } from '../models/event.model';
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

    return successResponse(
      res,
      {
        totalUsers,
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