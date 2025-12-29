import { Router } from 'express';
import {
  confirmBookingPost,
  createPaymentIntent,
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  confirmBooking
} from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';

const router = Router();

// All booking routes are protected
router.use(authenticate);

// Specific routes MUST come before parameterized routes
router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmBookingPost);
router.get('/my-bookings', getBookings); // Get user's bookings
router.post('/', createBooking);
router.get('/', getBookings); // Get bookings (with type query param)

// Parameterized routes LAST
router.get('/:id', getBookingById);
router.put('/:id', updateBooking);
router.patch('/:id/cancel', cancelBooking);
router.patch('/:id/confirm', confirmBooking);

export default router;