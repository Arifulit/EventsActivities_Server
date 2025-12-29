import { Router } from 'express';
import { register, login, getMe, updateProfile, refreshToken, logout, uploadProfileImage, getProfileCompleteness } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { updateProfileValidation } from '../validations/profile.validation';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/profile/completeness', authenticate, getProfileCompleteness);
router.put('/profile', authenticate, updateProfileValidation, validateRequest, updateProfile);
router.post('/upload-profile-image', authenticate, upload.single('profileImage'), uploadProfileImage);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

export default router;