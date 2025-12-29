import { Router } from 'express';
import {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getHostReviews,
  getMyReviews
} from '../controllers/review.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';

const router = Router();

// SPECIFIC routes FIRST (before parameterized routes)
router.get('/event/:eventId', getReviews); // Get reviews for specific event
router.get('/host/:hostId', getHostReviews); // Get reviews for specific host
router.get('/my/reviews', authenticate, getMyReviews); // Get authenticated user's reviews

// PROTECTED routes
router.use(authenticate);
router.post('/', createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);

// PARAMETERIZED routes LAST
router.get('/', getReviews); // Get all reviews (with query filters)
router.get('/:id', getReviewById); // Get single review by ID

export default router;