import { Request, Response } from 'express';
import { Event } from '../models/event.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';

export const createEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const eventData = {
      ...req.body,
      hostId: req.user._id,
      currentParticipants: 0
    };

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
    const city = req.query.city as string;
    const minPrice = req.query.minPrice as string;
    const maxPrice = req.query.maxPrice as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
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

    if (minPrice || maxPrice) {
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

    const event = await Event.findById(id)
      .populate('hostId', 'fullName profileImage bio averageRating totalReviews')
      .populate('participants', 'fullName profileImage')
      .populate('waitingList', 'fullName profileImage');

    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Check if event is public or user is the host
    if (!event.isPublic && event.hostId._id.toString() !== req.user._id.toString()) {
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

    // Check if user is the host or admin
    if (event.hostId.toString() !== req.user._id.toString() && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. Only event host can update event', 403);
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      req.body,
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

    // Check if user is the host or admin
    if (event.hostId.toString() !== req.user._id.toString() && req.user.role !== UserRole.ADMIN) {
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

    // Check if event is open and not full
    if (event.status !== 'open') {
      return errorResponse(res, 'Event is not open for joining', 400);
    }

    if (event.currentParticipants >= event.maxParticipants) {
      return errorResponse(res, 'Event is full', 400);
    }

    // Check if user is already a participant
    if (event.participants.includes(req.user._id)) {
      return errorResponse(res, 'You are already a participant', 400);
    }

    // Check if user is on waiting list
    if (event.waitingList.includes(req.user._id)) {
      // Remove from waiting list and add to participants
      event.waitingList = event.waitingList.filter(id => !id.equals(req.user._id));
    }

    // Add user to participants
    event.participants.push(req.user._id);
    event.currentParticipants += 1;

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

    const event = await Event.findById(id);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Check if user is a participant
    if (!event.participants.includes(req.user._id)) {
      return errorResponse(res, 'You are not a participant of this event', 400);
    }

    // Remove user from participants
    event.participants = event.participants.filter(id => !id.equals(req.user._id));
    event.currentParticipants -= 1;

    // Update status if event was full
    if (event.status === 'full') {
      event.status = 'open';
    }

    await event.save();

    // Remove event from user's joined events
    await req.user.joinedEvents.pull(id);
    await req.user.save();

    return successResponse(res, event, 'Successfully left the event');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
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
      if (routePath === '/hosted-events') {
        query.hostId = req.user._id;
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

export const getEventParticipants = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { eventId } = req.params;
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