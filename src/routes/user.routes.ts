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
  discoverUsers
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Public routes
router.get('/discover', discoverUsers);
router.get('/top-hosts', getTopHosts);
router.get('/:id/public', getPublicUserProfile);

// Protected routes
router.get('/', authenticate, authorize(UserRole.ADMIN), getUsers);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, updateUser);
router.post('/:id/upload-profile-image', authenticate, upload.single('profileImage'), uploadUserProfileImage);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), deleteUser);
router.patch('/:id/verify', authenticate, authorize(UserRole.ADMIN), toggleUserVerification);

export default router;