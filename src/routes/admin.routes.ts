import { Router } from 'express';
import {
  getAllUsers,
  getUserByIdAdmin,
  getUserActivity,
  updateUserRole,
  updateUserStatus,
  verifyUser,
  deleteUser,
  banUser,
  unbanUser,
  getAllEventsAdmin,
  getEventByIdAdmin,
  getReportedEvents,
  updateEventAdmin,
  updateEventStatus,
  deleteEventAdmin,
  getAllBookingsAdmin,
  processRefund,
  getRefundHistory,
  getRevenueSummary,
  getDashboardStats,
  getAllReviews,
  deleteReview,
  getHostsForModeration,
  approveHost,
  rejectHost,
  flagEvent,
  getFlaggedContent,
  resolveFlaggedContent,
  getUserAnalytics,
  getEventAnalytics,
  getRevenueAnalytics
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/dashboard/stats', getDashboardStats);

// Analytics
router.get('/analytics/users', getUserAnalytics);
router.get('/analytics/events', getEventAnalytics);
router.get('/analytics/revenue', getRevenueAnalytics);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserByIdAdmin);
router.get('/users/:userId/activity', getUserActivity);
router.put('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/status', updateUserStatus);
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
router.get('/events/reported', getReportedEvents);
router.get('/events/:eventId', getEventByIdAdmin);
router.put('/events/:eventId', updateEventAdmin);
router.put('/events/:eventId/status', updateEventStatus);
router.delete('/events/:eventId', deleteEventAdmin);
router.patch('/events/:eventId/flag', flagEvent);

// Booking Management
router.get('/bookings', getAllBookingsAdmin);

// Payment Management
router.post('/payments/refund', processRefund);
router.get('/payments/refund-history', getRefundHistory);

// Revenue Management
router.get('/revenue/summary', getRevenueSummary);

// Content Moderation
router.get('/reviews', getAllReviews);
router.delete('/reviews/:reviewId', deleteReview);
router.get('/flagged-content', getFlaggedContent);
router.patch('/flagged-content/:eventId/resolve', resolveFlaggedContent);

export default router;