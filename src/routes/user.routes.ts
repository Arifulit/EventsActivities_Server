import { Router } from 'express';
import {
  getUsers,
  getUserById,
  getPublicUserProfile,
  updateUser,
  deleteUser,
  toggleUserVerification,
  getTopHosts,
  uploadUserProfileImage,
  discoverUsers,
  getUserEvents,
  changePassword,
  getUserDashboard
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Public routes
router.get('/discover', discoverUsers);
router.get('/top-hosts', getTopHosts);

// Protected routes
router.get('/', authenticate, authorize(UserRole.ADMIN), getUsers);
router.get('/dashboard', authenticate, getUserDashboard);
router.get('/:userId/events', authenticate, getUserEvents);
router.post('/:userId/change-password', authenticate, changePassword);
router.put('/:userId/change-password', authenticate, changePassword);
router.get('/:id/public', getPublicUserProfile);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, upload.single('profileImage'), updateUser);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), deleteUser);
router.patch('/:id/verify', authenticate, authorize(UserRole.ADMIN), toggleUserVerification);

export default router;