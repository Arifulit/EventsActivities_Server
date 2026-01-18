import { Router } from 'express';
import { uploadEventImage, uploadEventImages, uploadProfileImage } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Upload single event image
router.post('/event-image', authenticate, upload.single('image'), uploadEventImage);

// Upload multiple event images
router.post('/event-images', authenticate, upload.array('images', 10), uploadEventImages);

// Upload profile image
router.post('/profile-image', authenticate, upload.single('image'), uploadProfileImage);

export default router;
