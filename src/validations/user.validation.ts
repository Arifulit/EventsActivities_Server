import { body, param, query, ValidationChain } from 'express-validator';
import { UserRole } from '../middleware/role.middleware';

// User registration validation
export const registerUserValidation: ValidationChain[] = [
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .trim()
    .escape(),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid user role'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters')
    .trim()
];

// User login validation
export const loginUserValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// User profile update validation
export const updateUserProfileValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
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
    .trim(),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('preferences.notifications')
    .optional()
    .isBoolean()
    .withMessage('Notification preference must be a boolean'),
  
  body('preferences.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters'),
  
  body('preferences.timezone')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Timezone must be between 1 and 50 characters')
];

// Change password validation
export const changePasswordValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

// Reset password request validation
export const resetPasswordRequestValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Reset password validation
export const resetPasswordValidation: ValidationChain[] = [
  body('accessToken')
    .notEmpty()
    .withMessage('Reset accessToken is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

// User ID parameter validation
export const userIdValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID')
];

// User query validation (for admin/user listing)
export const userQueryValidation: ValidationChain[] = [
  query('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid user role'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .trim(),
  
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
    .isIn(['name', 'email', 'createdAt', 'updatedAt', 'role'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Admin update user role validation
export const updateUserRoleValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('role')
    .isIn(Object.values(UserRole))
    .withMessage('Invalid user role'),
  
  body('reason')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be between 1 and 500 characters')
    .trim()
];

// Admin deactivate/activate user validation
export const updateUserStatusValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('reason')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be between 1 and 500 characters')
    .trim()
];

// User avatar upload validation
export const uploadAvatarValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID')
];

// User preferences update validation
export const updateUserPreferencesValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('notifications')
    .optional()
    .isBoolean()
    .withMessage('Notifications preference must be a boolean'),
  
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications preference must be a boolean'),
  
  body('pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('Push notifications preference must be a boolean'),
  
  body('language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters'),
  
  body('timezone')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Timezone must be between 1 and 50 characters'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-character code'),
  
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
  
  body('eventReminders')
    .optional()
    .isBoolean()
    .withMessage('Event reminders preference must be a boolean'),
  
  body('bookingConfirmations')
    .optional()
    .isBoolean()
    .withMessage('Booking confirmations preference must be a boolean'),
  
  body('paymentNotifications')
    .optional()
    .isBoolean()
    .withMessage('Payment notifications preference must be a boolean'),
  
  body('newsletter')
    .optional()
    .isBoolean()
    .withMessage('Newsletter preference must be a boolean')
];

// User verification validation
export const verifyUserValidation: ValidationChain[] = [
  body('accessToken')
    .notEmpty()
    .withMessage('Verification accessToken is required')
];

// Resend verification validation
export const resendVerificationValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// User analytics validation
export const userAnalyticsValidation: ValidationChain[] = [
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
  
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID')
];

// User export validation
export const exportUsersValidation: ValidationChain[] = [
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

// User batch operation validation
export const batchUserOperationValidation: ValidationChain[] = [
  body('action')
    .isIn(['activate', 'deactivate', 'delete', 'updateRole'])
    .withMessage('Invalid action'),
  
  body('userIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('User IDs must be an array with 1 to 100 items'),
  
  body('userIds.*')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
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

// User search validation
export const searchUsersValidation: ValidationChain[] = [
  query('q')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .trim(),
  
  query('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid user role'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt()
];

// Stripe account connection validation
export const connectStripeAccountValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('accountType')
    .isIn(['express', 'standard', 'custom'])
    .withMessage('Account type must be express, standard, or custom'),
  
  body('businessType')
    .isIn(['individual', 'company'])
    .withMessage('Business type must be individual or company'),
  
  body('country')
    .isLength({ min: 2, max: 2 })
    .withMessage('Country must be a 2-character code'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// User notification settings validation
export const updateNotificationSettingsValidation: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('newBooking')
    .optional()
    .isBoolean()
    .withMessage('newBooking must be a boolean'),
  
  body('bookingCancellation')
    .optional()
    .isBoolean()
    .withMessage('bookingCancellation must be a boolean'),
  
  body('eventReminder')
    .optional()
    .isBoolean()
    .withMessage('eventReminder must be a boolean'),
  
  body('eventUpdate')
    .optional()
    .isBoolean()
    .withMessage('eventUpdate must be a boolean'),
  
  body('eventCancellation')
    .optional()
    .isBoolean()
    .withMessage('eventCancellation must be a boolean'),
  
  body('paymentReceived')
    .optional()
    .isBoolean()
    .withMessage('paymentReceived must be a boolean'),
  
  body('refundProcessed')
    .optional()
    .isBoolean()
    .withMessage('refundProcessed must be a boolean'),
  
  body('marketingEmails')
    .optional()
    .isBoolean()
    .withMessage('marketingEmails must be a boolean'),
  
  body('securityAlerts')
    .optional()
    .isBoolean()
    .withMessage('securityAlerts must be a boolean')
];

// Custom validation functions for users
export const userCustomValidations = {
  validatePasswordStrength: (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  },
  
  validateUsername: (username: string): boolean => {
    // Username validation: 3-30 chars, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  },
  
  validatePhoneFormat: (phone: string): boolean => {
    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone);
  },
  
  validateTimezone: (timezone: string): boolean => {
    // Basic timezone validation (e.g., "America/New_York", "UTC")
    const timezoneRegex = /^[A-Za-z_\/]+$/;
    return timezoneRegex.test(timezone);
  },
  
  validateLanguageCode: (language: string): boolean => {
    // Language code validation (e.g., "en", "en-US")
    const languageRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
    return languageRegex.test(language);
  },
  
  validateCurrencyCode: (currency: string): boolean => {
    // Currency code validation (e.g., "USD", "EUR")
    const currencyRegex = /^[A-Z]{3}$/;
    return currencyRegex.test(currency);
  },
  
  validateDateRange: (startDate: Date, endDate: Date): boolean => {
    return startDate < endDate;
  },
  
  validateUserAge: (birthDate: Date): boolean => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18; // Must be at least 18 years old
    }
    
    return age >= 18;
  }
};