import { Router } from 'express';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
  saveEvent,
  getMyEvents,
  getAllParticipants,
  getEventParticipants,
  updateEventStatus,
  getEventRevenue,
  getEventBookings
} from '../controllers/event.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';
import { createEventValidation, updateEventValidation, eventIdValidation } from '../validations/event.validation';
import { validateRequest } from '../middleware/validation.middleware';
import { optionalUpload } from '../middleware/upload.middleware';

const router = Router();

// Public routes
router.get('/', getEvents);

// Protected routes - specific routes first (keep these above parameterized :id routes)
router.get('/my-events', authenticate, getMyEvents);
router.get('/hosted-events', authenticate, getMyEvents);
router.get('/my-hosted', authenticate, getMyEvents);
router.get('/my-joined', authenticate, getMyEvents);
router.get('/my-saved', authenticate, getMyEvents);
router.get('/my/:type', authenticate, getMyEvents);

// Protected routes - specific paths before parameterized :id routes
// optionalUpload works with both JSON and form-data
router.post('/', authenticate, authorize(UserRole.HOST, UserRole.ADMIN), optionalUpload, createEventValidation, validateRequest, createEvent);
router.get('/participants', getAllParticipants); // Public endpoint - must be before /:id/participants
router.get('/:id/participants', authenticate, eventIdValidation, validateRequest, getEventParticipants);
router.get('/:id/bookings', authenticate, getEventBookings);
router.get('/:id/revenue', authenticate, getEventRevenue);
router.patch('/:id/status', authenticate, updateEventStatus);
router.post('/:id/join', authenticate, eventIdValidation, validateRequest, joinEvent);
router.post('/:id/leave', authenticate, eventIdValidation, validateRequest, leaveEvent);
// Support DELETE for clients using RESTful semantics
router.delete('/:id/leave', authenticate, eventIdValidation, validateRequest, leaveEvent);
router.post('/:id/save', authenticate, eventIdValidation, validateRequest, saveEvent);
// Alias to avoid typos like /my-save
router.post('/:id/my-save', authenticate, eventIdValidation, validateRequest, saveEvent);

// Parameterized routes last
router.get('/:id', getEventById); // Make event details public - must be before PUT/DELETE with same param
// optionalUpload works with both JSON and form-data
router.put('/:id', authenticate, optionalUpload, updateEventValidation, validateRequest, updateEvent);
router.delete('/:id', authenticate, eventIdValidation, validateRequest, deleteEvent);

export default router;