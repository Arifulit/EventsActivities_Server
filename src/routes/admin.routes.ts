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
  getDashboardStats
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserByIdAdmin);
router.put('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/verify', verifyUser);
router.patch('/users/:userId/ban', banUser);
router.patch('/users/:userId/unban', unbanUser);
router.delete('/users/:userId', deleteUser);
router.get('/events', getAllEventsAdmin);
router.put('/events/:eventId/status', updateEventStatus);
router.delete('/events/:eventId', deleteEventAdmin);

export default router;