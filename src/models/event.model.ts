import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  type: string;
  category: string;
  date: Date;
  time: string;
  duration?: number;
  location: {
    venue: string;
    address: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  hostId: mongoose.Types.ObjectId;
  maxParticipants: number;
  currentParticipants: number;
  minParticipants?: number;
  price: number;
  image?: string;
  images?: string[];
  requirements?: string[];
  tags: string[];
  status: 'draft' | 'open' | 'full' | 'cancelled' | 'completed';
  isPublic: boolean;
  participants: mongoose.Types.ObjectId[];
  waitingList: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    type: {
      type: String,
      required: [true, 'Event type is required'],
      enum: ['concert', 'sports', 'dining', 'workshop', 'social', 'outdoor', 'indoor', 'online', 'other']
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      enum: ['music', 'sports', 'food', 'education', 'networking', 'entertainment', 'health', 'technology', 'art', 'travel', 'other']
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
      min: [new Date(), 'Event date cannot be in the past']
    },
    time: {
      type: String,
      required: [true, 'Event time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    duration: {
      type: Number,
      min: [15, 'Duration must be at least 15 minutes'],
      max: [720, 'Duration cannot exceed 12 hours']
    },
    location: {
      venue: {
        type: String,
        required: [true, 'Venue is required'],
        trim: true,
        maxlength: [200, 'Venue name cannot exceed 200 characters']
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters']
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
      },
      coordinates: {
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 }
      }
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    maxParticipants: {
      type: Number,
      required: [true, 'Maximum participants is required'],
      min: [1, 'Maximum participants must be at least 1'],
      max: [1000, 'Maximum participants cannot exceed 1000']
    },
    currentParticipants: {
      type: Number,
      default: 0,
      min: 0
    },
    minParticipants: {
      type: Number,
      min: [1, 'Minimum participants must be at least 1'],
      max: [1000, 'Minimum participants cannot exceed 1000']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      max: [10000, 'Price cannot exceed 10000']
    },
    image: {
      type: String,
      default: ''
    },
    images: [{
      type: String
    }],
    requirements: [{
      type: String,
      maxlength: [200, 'Requirement cannot exceed 200 characters']
    }],
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    status: {
      type: String,
      enum: ['draft', 'open', 'full', 'cancelled', 'completed'],
      default: 'open'
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    waitingList: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  {
    timestamps: true
  }
);

eventSchema.index({ hostId: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ 'location.city': 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ price: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

eventSchema.pre('save', function(next) {
  if (this.currentParticipants >= this.maxParticipants) {
    this.status = 'full';
  } else if (this.status === 'full' && this.currentParticipants < this.maxParticipants) {
    this.status = 'open';
  }
  next();
});

export const Event = mongoose.model<IEvent>('Event', eventSchema);