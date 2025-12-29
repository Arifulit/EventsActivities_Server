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
  getMyEvents
} from '../controllers/event.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';
import { createEventValidation, updateEventValidation, eventIdValidation } from '../validations/event.validation';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

// Public routes
router.get('/', getEvents);

// Protected routes - specific routes first
router.get('/my-events', authenticate, getMyEvents);
router.get('/hosted-events', authenticate, getMyEvents);
router.get('/my/:type', authenticate, getMyEvents);

// Public routes - parameterized routes last
router.get('/:id', authenticate, getEventById);

// Protected routes
router.post('/', authenticate, authorize(UserRole.HOST, UserRole.ADMIN), createEventValidation, validateRequest, createEvent);
router.put('/:id', authenticate, updateEventValidation, validateRequest, updateEvent);
router.delete('/:id', authenticate, eventIdValidation, validateRequest, deleteEvent);
router.post('/:id/join', authenticate, eventIdValidation, validateRequest, joinEvent);
router.post('/:id/leave', authenticate, eventIdValidation, validateRequest, leaveEvent);
router.post('/:id/save', authenticate, eventIdValidation, validateRequest, saveEvent);

export default router;