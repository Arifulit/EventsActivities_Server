import { Router } from 'express';
import {
  getAllUsers,
  getUserByIdAdmin,
  updateUserRole,
  verifyUser,
  deleteUser,
  banUser,
  unbanUser,
  getAllEventsAdmin,
  updateEventStatus,
  deleteEventAdmin,
  getDashboardStats,
  getAllReviews,
  deleteReview,
  getHostsForModeration,
  approveHost,
  rejectHost,
  flagEvent,
  getFlaggedContent,
  resolveFlaggedContent
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// Dashboard
router.get('/stats', getDashboardStats);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserByIdAdmin);
router.put('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/verify', verifyUser);
router.patch('/users/:userId/ban', banUser);
router.patch('/users/:userId/unban', unbanUser);
router.delete('/users/:userId', deleteUser);

// Host Management
router.get('/hosts', getHostsForModeration);
router.patch('/hosts/:hostId/approve', approveHost);
router.patch('/hosts/:hostId/reject', rejectHost);

// Event Management
router.get('/events', getAllEventsAdmin);
router.put('/events/:eventId/status', updateEventStatus);
router.delete('/events/:eventId', deleteEventAdmin);
router.patch('/events/:eventId/flag', flagEvent);

// Content Moderation
router.get('/reviews', getAllReviews);
router.delete('/reviews/:reviewId', deleteReview);
router.get('/flagged-content', getFlaggedContent);
router.patch('/flagged-content/:eventId/resolve', resolveFlaggedContent);

export default router;