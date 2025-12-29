import { body, param, query, ValidationChain } from 'express-validator';
import { EVENT_CATEGORIES, EVENT_STATUSES, EVENT_TYPES } from '../types/event.type';

// Event creation validations
export const createEventValidation: ValidationChain[] = [
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
    .isIn(['music', 'sports', 'food', 'education', 'networking', 'entertainment', 'health', 'technology', 'art', 'travel', 'other'])
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
  
  body('maxParticipants')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Maximum participants must be between 1 and 10000'),
  
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
    .isIn(['concert', 'sports', 'dining', 'workshop', 'social', 'outdoor', 'indoor', 'online', 'other'])
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
  
  body('requirements.*')
    .isLength({ min: 1, max: 200 })
    .withMessage('Each requirement must be between 1 and 200 characters')
    .trim(),
];

// Event update validations
export const updateEventValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID'),
  
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
  
  body('maxParticipants')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Maximum participants must be between 1 and 10000'),
  
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
    .withMessage('Requirements must be an array with maximum 20 items'),
  
  body('isOnline')
    .optional()
    .isBoolean()
    .withMessage('isOnline must be a boolean'),
  
  body('meetingLink')
    .optional()
    .isURL()
    .withMessage('Meeting link must be a valid URL')
];

// Event query/search validations
export const eventQueryValidation: ValidationChain[] = [
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
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sortBy')
    .optional()
    .isIn(['date', 'price', 'title', 'createdAt', 'popularity', 'capacity'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Event ID parameter validation
export const eventIdValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID')
];

// Event publish validation
export const publishEventValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID'),
  
  body('publishDate')
    .optional()
    .isISO8601()
    .withMessage('Publish date must be a valid date')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('Publish date must be in the future');
      }
      return true;
    })
];

// Event cancel validation
export const cancelEventValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID'),
  
  body('reason')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Cancellation reason must be between 1 and 500 characters')
    .trim(),
  
  body('notifyAttendees')
    .optional()
    .isBoolean()
    .withMessage('notifyAttendees must be a boolean'),
  
  body('refundPolicy')
    .optional()
    .isIn(['full', 'partial', 'none'])
    .withMessage('Invalid refund policy')
];

// Event duplicate validation
export const duplicateEventValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID'),
  
  body('newTitle')
    .isLength({ min: 3, max: 100 })
    .withMessage('New title must be between 3 and 100 characters')
    .trim()
    .escape(),
  
  body('newDate')
    .optional()
    .isISO8601()
    .withMessage('New date must be a valid date')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('New date must be in the future');
      }
      return true;
    }),
  
  body('newTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('New time must be in HH:MM format'),
  
  body('copyImages')
    .optional()
    .isBoolean()
    .withMessage('copyImages must be a boolean'),
  
  body('copyRequirements')
    .optional()
    .isBoolean()
    .withMessage('copyRequirements must be a boolean'),
  
  body('copyTags')
    .optional()
    .isBoolean()
    .withMessage('copyTags must be a boolean')
];

// Event batch operation validation
export const batchEventOperationValidation: ValidationChain[] = [
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
    .withMessage('Data must be an object'),
  
  body('reason')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be between 1 and 500 characters')
    .trim()
];

// Event template validation
export const createEventTemplateValidation: ValidationChain[] = [
  body('name')
    .isLength({ min: 3, max: 100 })
    .withMessage('Template name must be between 3 and 100 characters')
    .trim()
    .escape(),
  
  body('description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Template description must be between 10 and 500 characters')
    .trim(),
  
  body('category')
    .isIn(['music', 'sports', 'food', 'education', 'networking', 'entertainment', 'health', 'technology', 'art', 'travel', 'other'])
    .withMessage('Invalid event category'),
  
  body('duration')
    .isInt({ min: 15, max: 1440 })
    .withMessage('Duration must be between 15 and 1440 minutes'),
  
  body('basePrice')
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Base price must be between 0 and 10000'),
  
  body('defaultCapacity')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Default capacity must be between 1 and 10000'),
  
  body('defaultRequirements')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Default requirements must be an array with maximum 20 items'),
  
  body('defaultRequirements.*.text')
    .isLength({ min: 1, max: 100 })
    .withMessage('Requirement text must be between 1 and 100 characters')
    .trim()
    .escape(),
  
  body('defaultTags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Default tags must be an array with maximum 10 items'),
  
  body('defaultTags.*')
    .isLength({ min: 1, max: 20 })
    .withMessage('Each tag must be between 1 and 20 characters')
    .trim()
    .escape(),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

// Event from template validation
export const createEventFromTemplateValidation: ValidationChain[] = [
  param('templateId')
    .isMongoId()
    .withMessage('Invalid template ID'),
  
  body('title')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters')
    .trim()
    .escape(),
  
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
  
  body('price')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Price must be between 0 and 10000'),
  
  body('maxParticipants')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Maximum participants must be between 1 and 10000'),
  
  body('customizations')
    .optional()
    .isObject()
    .withMessage('Customizations must be an object'),
  
  body('customizations.requirements')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Requirements must be an array with maximum 20 items'),
  
  body('customizations.tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  
  body('customizations.description')
    .optional()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters')
    .trim()
];

// Event analytics validation
export const eventAnalyticsValidation: ValidationChain[] = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Group by must be day, week, month, or year'),
  
  query('hostId')
    .optional()
    .isMongoId()
    .withMessage('Invalid host ID'),
  
  query('category')
    .optional()
    .isIn(EVENT_CATEGORIES)
    .withMessage('Invalid event category')
];

// Event export validation
export const eventExportValidation: ValidationChain[] = [
  body('format')
    .isIn(['csv', 'json', 'xlsx'])
    .withMessage('Format must be csv, json, or xlsx'),
  
  body('fields')
    .isArray({ min: 1 })
    .withMessage('Fields must be an array with at least one item'),
  
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  
  body('dateRange')
    .optional()
    .isObject()
    .withMessage('Date range must be an object'),
  
  body('dateRange.start')
    .if(body('dateRange').exists())
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('dateRange.end')
    .if(body('dateRange').exists())
    .isISO8601()
    .withMessage('End date must be a valid date')
];

// Custom validation functions for events
export const eventCustomValidations = {
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
  },
  
  validateEventDuration: (duration: number): boolean => {
    return duration >= 15 && duration <= 1440; // 15 min to 24 hours
  },
  
  validateEventPrice: (price: number): boolean => {
    return price >= 0 && price <= 10000;
  },
  
  validateEventCapacity: (capacity: number): boolean => {
    return capacity >= 1 && capacity <= 10000;
  }
};