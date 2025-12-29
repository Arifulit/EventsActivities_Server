import { Event } from '../models/event.model';
import { User } from '../models/user.model';
import { Booking } from '../models/booking.model';
import { uploadImage, deleteImage, uploadMultipleImages, deleteMultipleImages } from '../config/cloudinary';
import { UserRole } from '../middleware/role.middleware';

export interface CreateEventData {
  title: string;
  description: string;
  category: string;
  date: Date;
  time: string;
  duration: number;
  location: {
    venue: string;
    address: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  maxParticipants: number;
  images?: string[];
  tags?: string[];
  requirements?: string[];
  isOnline?: boolean;
  meetingLink?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  status?: 'draft' | 'open' | 'cancelled' | 'completed';
}

export interface EventFilters {
  category?: string;
  city?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  hostId?: string;
  status?: string;
  isOnline?: boolean;
}

export interface EventQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'price' | 'title' | 'createdAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  filters?: EventFilters;
}

export class EventService {
  static async createEvent(data: CreateEventData, hostId: string, imageFiles?: Express.Multer.File[]) {
    const {
      title,
      description,
      category,
      date,
      time,
      duration,
      location,
      price,
      maxParticipants,
      images,
      tags,
      requirements,
      isOnline = false,
      meetingLink
    } = data;

    // Verify host exists and is a host
    const host = await User.findById(hostId);
    if (!host || host.role !== UserRole.HOST) {
      throw new Error('Only hosts can create events');
    }

    // Handle image uploads
    let uploadedImages: string[] = [];
    if (imageFiles && imageFiles.length > 0) {
      try {
        const uploadResults = await uploadMultipleImages(
          imageFiles.map(file => file.path),
          'events'
        );
        uploadedImages = uploadResults.map(result => result.url);
      } catch (error) {
        throw new Error('Failed to upload event images');
      }
    } else if (images && images.length > 0) {
      uploadedImages = images;
    }

    // Create event
    const event = new Event({
      title,
      description,
      category,
      date,
      time,
      duration,
      location,
      price,
      maxParticipants: maxParticipants,
      hostId,
      images: uploadedImages,
      tags: tags || [],
      requirements: requirements || [],
      isOnline,
      meetingLink: isOnline ? meetingLink : undefined,
      status: 'draft',
      currentParticipants: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await event.save();
    return event;
  }

  static async updateEvent(eventId: string, data: UpdateEventData, hostId: string, imageFiles?: Express.Multer.File[]) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Check permissions
    if (event.hostId.toString() !== hostId) {
      throw new Error('You can only update your own events');
    }

    // Handle image updates
    if (imageFiles && imageFiles.length > 0) {
      // Delete old images
      if (event.images && event.images.length > 0) {
        const publicIds = event.images.map(img => {
          const parts = img.split('/');
          const filename = parts[parts.length - 1];
          const publicId = `events/${filename.split('.')[0]}`;
          return publicId;
        });
        await deleteMultipleImages(publicIds);
      }

      // Upload new images
      try {
        const uploadResults = await uploadMultipleImages(
          imageFiles.map(file => file.path),
          'events'
        );
        data.images = uploadResults.map(result => result.url);
      } catch (error) {
        throw new Error('Failed to upload event images');
      }
    }

    // Update event
    Object.assign(event, data);
    event.updatedAt = new Date();
    await event.save();

    return event;
  }

  static async deleteEvent(eventId: string, hostId: string) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Check permissions
    if (event.hostId.toString() !== hostId) {
      throw new Error('You can only delete your own events');
    }

    // Check if event has bookings
    const bookingCount = await Booking.countDocuments({ eventId, status: { $ne: 'cancelled' } });
    if (bookingCount > 0) {
      throw new Error('Cannot delete event with active bookings');
    }

    // Delete event images
    if (event.images && event.images.length > 0) {
      const publicIds = event.images.map(img => {
        const parts = img.split('/');
        const filename = parts[parts.length - 1];
        const publicId = `events/${filename.split('.')[0]}`;
        return publicId;
      });
      await deleteMultipleImages(publicIds);
    }

    await Event.findByIdAndDelete(eventId);
  }

  static async getEventById(eventId: string) {
    const event = await Event.findById(eventId).populate('hostId', 'name email');
    if (!event) {
      throw new Error('Event not found');
    }

    // Get booking count
    const bookingCount = await Booking.countDocuments({ 
      eventId, 
      status: { $ne: 'cancelled' } 
    });
    
    const eventObj = event.toObject();
    eventObj.currentParticipants = bookingCount;

    return {
      ...eventObj,
      availableSpots: event.maxParticipants - bookingCount
    };
  }

  static async getEvents(options: EventQueryOptions = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'asc',
      filters = {}
    } = options;

    // Build query
    const query: any = {};

    // Apply filters
    if (filters.category) query.category = filters.category;
    if (filters.city) query['location.city'] = filters.city;
    if (filters.status) query.status = filters.status;
    if (filters.isOnline !== undefined) query.isOnline = filters.isOnline;
    if (filters.hostId) query.hostId = filters.hostId;

    if (filters.dateRange) {
      query.date = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      };
    }

    if (filters.priceRange) {
      query.price = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max
      };
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    // Only show open events by default
    if (!filters.status) {
      query.status = 'open';
    }

    // Sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const events = await Event.find(query)
      .populate('hostId', 'name email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    // Get booking counts for each event
    const eventsWithBookings = await Promise.all(
      events.map(async (event) => {
        const bookingCount = await Booking.countDocuments({ 
          eventId: event._id, 
          status: { $ne: 'cancelled' } 
        });
        
        const eventObj = event.toObject() as any;
        eventObj.currentParticipants = bookingCount;
        eventObj.availableSpots = event.maxParticipants - bookingCount;
        return eventObj;
      })
    );

    // Get total count
    const total = await Event.countDocuments(query);

    return {
      events: eventsWithBookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getEventsByHost(hostId: string, options: EventQueryOptions = {}) {
    const hostOptions = { ...options, filters: { ...options.filters, hostId } };
    return this.getEvents(hostOptions);
  }

  static async publishEvent(eventId: string, hostId: string) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.hostId.toString() !== hostId) {
      throw new Error('You can only publish your own events');
    }

    if (event.status !== 'draft') {
      throw new Error('Only draft events can be published');
    }

    event.status = 'open';
    event.updatedAt = new Date();
    await event.save();

    return event;
  }

  static async cancelEvent(eventId: string, hostId: string) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.hostId.toString() !== hostId) {
      throw new Error('You can only cancel your own events');
    }

    if (event.status === 'cancelled') {
      throw new Error('Event is already cancelled');
    }

    event.status = 'cancelled';
    event.updatedAt = new Date();
    await event.save();

    // Cancel all related bookings
    await Booking.updateMany(
      { eventId, status: { $ne: 'cancelled' } },
      { status: 'cancelled', updatedAt: new Date() }
    );

    return event;
  }

  static async searchEvents(query: string, options: EventQueryOptions = {}) {
    const searchOptions = {
      ...options,
      filters: {
        ...options.filters,
        $text: { $search: query }
      }
    };

    return this.getEvents(searchOptions);
  }

  static async getEventCategories() {
    const categories = await Event.distinct('category');
    return categories.sort();
  }

  static async getEventCities() {
    const cities = await Event.distinct('location.city');
    return cities.sort();
  }

  static async getEventTags() {
    const tags = await Event.distinct('tags');
    return tags.sort();
  }

  static async getPopularEvents(limit: number = 10) {
    const events = await Booking.aggregate([
      {
        $match: { status: { $ne: 'cancelled' } }
      },
      {
        $group: {
          _id: '$eventId',
          bookingCount: { $sum: 1 }
        }
      },
      {
        $sort: { bookingCount: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $unwind: '$event'
      },
      {
        $match: { 'event.status': 'open' }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'event.hostId',
          foreignField: '_id',
          as: 'host'
        }
      },
      {
        $unwind: '$host'
      }
    ]);

    return events.map(item => ({
      ...item.event,
      host: {
        name: item.host.name,
        email: item.host.email
      },
      popularity: item.bookingCount
    }));
  }
}