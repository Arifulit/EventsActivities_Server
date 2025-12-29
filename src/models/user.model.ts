import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../middleware/role.middleware';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  profileImage?: string;
  bio?: string;
  interests: string[];
  location: {
    city: string;
    area?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  isVerified: boolean;
  isActive: boolean;
  averageRating: number;
  totalReviews: number;
  stripeAccountId?: string;
  hostedEvents: mongoose.Types.ObjectId[];
  joinedEvents: mongoose.Types.ObjectId[];
  savedEvents: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER
    },
    profileImage: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: ''
    },
    interests: [{
      type: String,
      trim: true
    }],
    location: {
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
      },
      area: {
        type: String,
        trim: true
      },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      }
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    },
    stripeAccountId: {
      type: String,
      default: ''
    },
    hostedEvents: [{
      type: Schema.Types.ObjectId,
      ref: 'Event'
    }],
    joinedEvents: [{
      type: Schema.Types.ObjectId,
      ref: 'Event'
    }],
    savedEvents: [{
      type: Schema.Types.ObjectId,
      ref: 'Event'
    }]
  },
  {
    timestamps: true
  }
);

// Removed duplicate email index (already defined with unique: true in schema)
userSchema.index({ 'location.city': 1 });
userSchema.index({ interests: 1 });
userSchema.index({ averageRating: -1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export const User = mongoose.model<IUser>('User', userSchema);