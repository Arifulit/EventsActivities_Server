import { Router } from 'express';
import { getHostEarnings } from '../controllers/admin.controller';
import { getHostEarningsSummary, getHostPayments } from '../controllers/payment.controller';
import { getHostBookings, getHostStats, getHostRatingStats } from '../controllers/host.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireHostOrAdmin } from '../middleware/role.middleware';

const router = Router();

// Host's own bookings - all bookings for all hosted events
router.get('/me/bookings', authenticate, requireHostOrAdmin, getHostBookings);

// Host's statistics dashboard
router.get('/me/stats', authenticate, requireHostOrAdmin, getHostStats);

// Host's own earnings summary - host or admin can access
router.get('/me/earnings', authenticate, requireHostOrAdmin, getHostEarningsSummary);
router.get('/me/earnings/details', authenticate, requireHostOrAdmin, getHostPayments);

// Get specific host earnings - admin only
router.get('/:hostId/earnings', authenticate, requireAdmin, getHostEarnings);

// Get specific host rating stats - accessible to authenticated users
router.get('/:hostId/rating-stats', authenticate, getHostRatingStats);

export default router;
