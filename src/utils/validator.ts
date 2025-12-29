import { body, param, query, ValidationChain } from 'express-validator';
import { EVENT_CATEGORIES, EVENT_STATUSES, EVENT_TYPES } from '../types/event.type';
import { UserRole } from '../middleware/role.middleware';

// Common validation rules
export const commonValidations = {
  email: body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  name: body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .trim()
    .escape(),
  
  id: param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  sortBy: query('sortBy')
    .optional()
    .isIn(['date', 'price', 'title', 'createdAt', 'popularity', 'capacity'])
    .withMessage('Invalid sort field'),
  
  sortOrder: query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
};

// User validations
export const userValidations = {
  register: [
    commonValidations.name,
    commonValidations.email,
    commonValidations.password,
    body('role')
      .optional()
      .isIn(Object.values(UserRole))
      .withMessage('Invalid user role')
  ],
  
  login: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  
  updateProfile: [
    body('name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .trim()
      .escape(),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio must not exceed 500 characters')
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ]
};

// Event validations
export const eventValidations = {
  create: [
    body('title')
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters')
      .trim()
      .escape(),
    
    body('description')
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters')
      .trim(),
    
    body('category')
      .isIn(EVENT_CATEGORIES)
      .withMessage('Invalid event category'),
    
    body('date')
      .isISO8601()
      .withMessage('Please provide a valid date')
      .custom((value) => {
        const date = new Date(value);
        if (date <= new Date()) {
          throw new Error('Event date must be in the future');
        }
        return true;
      }),
    
    body('time')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time must be in HH:MM format'),
    
    body('duration')
      .isInt({ min: 15, max: 1440 })
      .withMessage('Duration must be between 15 and 1440 minutes'),
    
    body('price')
      .isFloat({ min: 0, max: 10000 })
      .withMessage('Price must be between 0 and 10000'),
    
    body('capacity')
      .isInt({ min: 1, max: 10000 })
      .withMessage('Capacity must be between 1 and 10000'),
    
    body('location.venue')
      .isLength({ min: 2, max: 100 })
      .withMessage('Venue name must be between 2 and 100 characters')
      .trim()
      .escape(),
    
    body('location.address')
      .isLength({ min: 5, max: 200 })
      .withMessage('Address must be between 5 and 200 characters')
      .trim(),
    
    body('location.city')
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters')
      .trim()
      .escape(),
    
    body('location.coordinates.lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    
    body('location.coordinates.lng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    
    body('type')
      .isIn(EVENT_TYPES)
      .withMessage('Invalid event type'),
    
    body('isOnline')
      .optional()
      .isBoolean()
      .withMessage('isOnline must be a boolean'),
    
    body('meetingLink')
      .optional()
      .isURL()
      .withMessage('Meeting link must be a valid URL'),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items'),
    
    body('tags.*')
      .isLength({ min: 1, max: 20 })
      .withMessage('Each tag must be between 1 and 20 characters')
      .trim()
      .escape(),
    
    body('requirements')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Requirements must be an array with maximum 20 items'),
    
    body('requirements.*.text')
      .isLength({ min: 1, max: 100 })
      .withMessage('Requirement text must be between 1 and 100 characters')
      .trim()
      .escape(),
    
    body('requirements.*.isOptional')
      .optional()
      .isBoolean()
      .withMessage('isOptional must be a boolean')
  ],
  
  update: [
    body('title')
      .optional()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters')
      .trim()
      .escape(),
    
    body('description')
      .optional()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters')
      .trim(),
    
    body('category')
      .optional()
      .isIn(EVENT_CATEGORIES)
      .withMessage('Invalid event category'),
    
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date')
      .custom((value) => {
        const date = new Date(value);
        if (date <= new Date()) {
          throw new Error('Event date must be in the future');
        }
        return true;
      }),
    
    body('time')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time must be in HH:MM format'),
    
    body('duration')
      .optional()
      .isInt({ min: 15, max: 1440 })
      .withMessage('Duration must be between 15 and 1440 minutes'),
    
    body('price')
      .optional()
      .isFloat({ min: 0, max: 10000 })
      .withMessage('Price must be between 0 and 10000'),
    
    body('capacity')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Capacity must be between 1 and 10000'),
    
    body('status')
      .optional()
      .isIn(EVENT_STATUSES)
      .withMessage('Invalid event status'),
    
    body('location.venue')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Venue name must be between 2 and 100 characters')
      .trim()
      .escape(),
    
    body('location.address')
      .optional()
      .isLength({ min: 5, max: 200 })
      .withMessage('Address must be between 5 and 200 characters')
      .trim(),
    
    body('location.city')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters')
      .trim()
      .escape(),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items'),
    
    body('requirements')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Requirements must be an array with maximum 20 items')
  ],
  
  query: [
    query('category')
      .optional()
      .isIn(EVENT_CATEGORIES)
      .withMessage('Invalid event category'),
    
    query('city')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters')
      .trim(),
    
    query('status')
      .optional()
      .isIn(EVENT_STATUSES)
      .withMessage('Invalid event status'),
    
    query('type')
      .optional()
      .isIn(EVENT_TYPES)
      .withMessage('Invalid event type'),
    
    query('isOnline')
      .optional()
      .isBoolean()
      .withMessage('isOnline must be a boolean'),
    
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum price must be a positive number'),
    
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum price must be a positive number'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date'),
    
    query('search')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .trim(),
    
    query('tags')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          return true; // Single tag
        }
        if (Array.isArray(value)) {
          if (value.length > 10) {
            throw new Error('Maximum 10 tags allowed');
          }
          return true;
        }
        throw new Error('Tags must be a string or array');
      }),
    
    commonValidations.page,
    commonValidations.limit,
    commonValidations.sortBy,
    commonValidations.sortOrder
  ]
};

// Booking validations
export const bookingValidations = {
  create: [
    body('eventId')
      .isMongoId()
      .withMessage('Invalid event ID'),
    
    body('quantity')
      .isInt({ min: 1, max: 10 })
      .withMessage('Quantity must be between 1 and 10')
      .toInt()
  ],
  
  update: [
    commonValidations.id,
    body('status')
      .isIn(['pending', 'confirmed', 'cancelled'])
      .withMessage('Invalid booking status')
  ],
  
  refund: [
    commonValidations.id,
    body('reason')
      .optional()
      .isLength({ min: 1, max: 500 })
      .withMessage('Reason must be between 1 and 500 characters')
      .trim(),
    
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Refund amount must be greater than 0')
  ]
};

// Review validations
export const reviewValidations = {
  create: [
    body('eventId')
      .isMongoId()
      .withMessage('Invalid event ID'),
    
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5')
      .toInt(),
    
    body('comment')
      .optional()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters')
      .trim()
  ],
  
  update: [
    commonValidations.id,
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5')
      .toInt(),
    
    body('comment')
      .optional()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters')
      .trim()
  ]
};

// Payment validations
export const paymentValidations = {
  createIntent: [
    body('eventId')
      .isMongoId()
      .withMessage('Invalid event ID'),
    
    body('quantity')
      .isInt({ min: 1, max: 10 })
      .withMessage('Quantity must be between 1 and 10')
      .toInt()
  ],
  
  confirmPayment: [
    body('paymentIntentId')
      .isLength({ min: 1 })
      .withMessage('Payment intent ID is required')
      .trim()
  ],
  
  payout: [
    body('amount')
      .isFloat({ min: 1, max: 10000 })
      .withMessage('Payout amount must be between 1 and 10000')
  ]
};

// Admin validations
export const adminValidations = {
  updateUserRole: [
    commonValidations.id,
    body('role')
      .isIn(Object.values(UserRole))
      .withMessage('Invalid user role')
  ],
  
  bulkOperation: [
    body('action')
      .isIn(['publish', 'cancel', 'delete', 'update'])
      .withMessage('Invalid action'),
    
    body('eventIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Event IDs must be an array with 1 to 50 items'),
    
    body('eventIds.*')
      .isMongoId()
      .withMessage('Invalid event ID format'),
    
    body('data')
      .optional()
      .isObject()
      .withMessage('Data must be an object')
  ]
};

// Custom validation functions
export const customValidations = {
  validateDateRange: (startDate: Date, endDate: Date): boolean => {
    return startDate < endDate;
  },
  
  validatePriceRange: (minPrice: number, maxPrice: number): boolean => {
    return minPrice <= maxPrice;
  },
  
  validateCoordinates: (lat: number, lng: number): boolean => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  },
  
  validateFutureDate: (date: Date): boolean => {
    return date > new Date();
  },
  
  validateCapacity: (current: number, capacity: number): boolean => {
    return current <= capacity;
  }
};

// Validation middleware helper
export const validate = (validations: ValidationChain[]) => {
  return async (req: any, res: any, next: any) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = req.validationErrors();
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    
    next();
  };
};

// Sanitization helpers
export const sanitizers = {
  trimAndEscape: (value: string): string => {
    return value.trim().replace(/[<>]/g, '');
  },
  
  normalizeEmail: (email: string): string => {
    return email.toLowerCase().trim();
  },
  
  formatPhone: (phone: string): string => {
    return phone.replace(/\D/g, '');
  }
};

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: any;
}

// Generic validation function
export const validateObject = (
  data: any,
  schema: Record<string, (value: any) => string | null>
): ValidationResult => {
  const errors: ValidationError[] = [];
  
  for (const [field, validator] of Object.entries(schema)) {
    const error = validator(data[field]);
    if (error) {
      errors.push({
        field,
        message: error,
        value: data[field]
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : undefined
  };
};