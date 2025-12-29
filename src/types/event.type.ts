export interface EventLocation {
  venue: string;
  address: string;
  city: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface EventImage {
  url: string;
  publicId?: string;
  alt?: string;
  isPrimary?: boolean;
}

export interface EventRequirement {
  id: string;
  text: string;
  isOptional?: boolean;
}

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventType = 'in-person' | 'online' | 'hybrid';

// Runtime values for validation
export const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'completed'] as const;
export const EVENT_TYPES = ['in-person', 'online', 'hybrid'] as const;
// Runtime values for validation
export const EVENT_CATEGORIES = [
  'conference',
  'workshop',
  'seminar',
  'networking',
  'social',
  'sports',
  'entertainment',
  'education',
  'business',
  'technology',
  'arts',
  'music',
  'food',
  'health',
  'other'
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];

export interface BaseEvent {
  title: string;
  description: string;
  category: EventCategory;
  date: Date;
  time: string;
  duration: number; // in minutes
  location: EventLocation;
  price: number;
  capacity: number;
  tags: string[];
  requirements: EventRequirement[];
  images: EventImage[];
  type: EventType;
  meetingLink?: string;
}

export interface CreateEventRequest extends BaseEvent {
  // Additional fields for creation
  isOnline?: boolean;
}

export interface UpdateEventRequest extends Partial<BaseEvent> {
  status?: EventStatus;
  // Additional fields for updates
  isOnline?: boolean;
  meetingLink?: string;
}

export interface EventResponse extends BaseEvent {
  id: string;
  hostId: string;
  status: EventStatus;
  currentBookings: number;
  availableSpots: number;
  isOnline: boolean;
  meetingLink?: string;
  createdAt: Date;
  updatedAt: Date;
  host?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  popularity?: number; // For search results
}

export interface EventListResponse {
  events: EventResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface EventFilters {
  category?: EventCategory;
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
  status?: EventStatus;
  type?: EventType;
  isOnline?: boolean;
  minCapacity?: number;
  maxCapacity?: number;
}

export interface EventQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'price' | 'title' | 'createdAt' | 'popularity' | 'capacity';
  sortOrder?: 'asc' | 'desc';
  filters?: EventFilters;
  search?: string;
}

export interface EventSearchRequest {
  query: string;
  options?: EventQueryOptions;
}

export interface EventAnalytics {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  cancelledEvents: number;
  completedEvents: number;
  totalBookings: number;
  totalRevenue: number;
  averagePrice: number;
  averageCapacity: number;
  averageAttendance: number;
  popularCategories: Array<{
    category: EventCategory;
    count: number;
  }>;
  upcomingEvents: number;
  pastEvents: number;
}

export interface HostEventAnalytics {
  events: EventResponse[];
  analytics: {
    totalEvents: number;
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    upcomingEvents: number;
    completedEvents: number;
    cancelledEvents: number;
  };
  monthlyStats: Array<{
    month: string;
    events: number;
    bookings: number;
    revenue: number;
  }>;
}

export interface EventValidationRules {
  title: {
    required: true;
    minLength: 3;
    maxLength: 100;
  };
  description: {
    required: true;
    minLength: 10;
    maxLength: 2000;
  };
  category: {
    required: true;
    allowed: EventCategory[];
  };
  date: {
    required: true;
    minDate: Date; // Must be future date
  };
  time: {
    required: true;
    format: 'HH:mm';
  };
  duration: {
    required: true;
    min: 15; // minutes
    max: 1440; // 24 hours
  };
  price: {
    required: true;
    min: 0;
    max: 10000;
  };
  maxParticipants: {
    required: true;
    min: 1;
    max: 10000;
  };
  location: {
    venue: {
      required: true;
      minLength: 2;
      maxLength: 100;
    };
    address: {
      required: true;
      minLength: 5;
      maxLength: 200;
    };
    city: {
      required: true;
      minLength: 2;
      maxLength: 50;
    };
  };
  images: {
    maxCount: 10;
    allowedTypes: ["jpg", "jpeg", "png", "gif", "webp"];
    maxSize: 5242880; // 5MB
  };
  requirements: {
    maxCount: 20;
    maxLength: 100;
  };
}

export interface EventBookingInfo {
  eventId: string;
  title: string;
  date: Date;
  time: string;
  location: EventLocation;
  price: number;
  availableSpots: number;
  hostName: string;
  isOnline: boolean;
  meetingLink?: string;
}

export interface EventCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  category: EventCategory;
  status: EventStatus;
  price: number;
  availableSpots: number;
}

export interface EventExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  fields: (keyof EventResponse)[];
  filters?: EventFilters;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface EventImportData {
  events: CreateEventRequest[];
  options: {
    skipValidation?: boolean;
    updateExisting?: boolean;
    notifyOnErrors?: boolean;
  };
}

export interface EventNotificationSettings {
  newBooking: boolean;
  bookingCancellation: boolean;
  eventReminder: boolean;
  eventUpdate: boolean;
  eventCancellation: boolean;
  paymentReceived: boolean;
  refundProcessed: boolean;
}

export interface EventShareOptions {
  platforms: ('facebook' | 'twitter' | 'linkedin' | 'email' | 'whatsapp')[];
  message?: string;
  includeImage?: boolean;
  customLink?: string;
}

export interface EventReviewSummary {
  eventId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recentReviews: Array<{
    id: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: Date;
  }>;
}

export interface EventDuplicateRequest {
  sourceEventId: string;
  newTitle: string;
  newDate?: Date;
  newTime?: string;
  copyImages?: boolean;
  copyRequirements?: boolean;
  copyTags?: boolean;
}

export interface EventBatchOperation {
  action: 'publish' | 'cancel' | 'delete' | 'update';
  eventIds: string[];
  data?: Partial<UpdateEventRequest>;
}

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  duration: number;
  basePrice: number;
  defaultCapacity: number;
  defaultRequirements: EventRequirement[];
  defaultTags: string[];
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
}

export interface EventFromTemplate {
  templateId: string;
  title: string;
  date: Date;
  time: string;
  location: EventLocation;
  price?: number;
  capacity?: number;
  customizations?: {
    requirements?: EventRequirement[];
    tags?: string[];
    description?: string;
  };
}

// Error types
export interface EventError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export type EventErrorCode = 
  | 'EVENT_NOT_FOUND'
  | 'EVENT_ALREADY_EXISTS'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'EVENT_FULL'
  | 'EVENT_PAST'
  | 'INVALID_DATE'
  | 'INVALID_PRICE'
  | 'INVALID_CAPACITY'
  | 'INVALID_LOCATION'
  | 'IMAGE_UPLOAD_FAILED'
  | 'TEMPLATE_NOT_FOUND'
  | 'BOOKING_CONFLICT'
  | 'PAYMENT_REQUIRED';