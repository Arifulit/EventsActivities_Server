import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, errorResponse } from '../utils/response';
import { uploadImage } from '../services/cloudinary.service';

export const uploadEventImage = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Check if file exists
    if (!req.file) {
      return errorResponse(res, 'No image file provided', 400);
    }

    // Upload to cloudinary
    const imageUrl = await uploadImage(req.file.buffer, 'events');

    return successResponse(res, { imageUrl }, 'Image uploaded successfully', 200);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to upload image', 500);
  }
};

export const uploadEventImages = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const files = req.files as Express.Multer.File[];

    // Check if files exist
    if (!files || files.length === 0) {
      return errorResponse(res, 'No image files provided', 400);
    }

    // Upload all images to cloudinary
    const imageUrls = await Promise.all(
      files.map((file) => uploadImage(file.buffer, 'events'))
    );

    return successResponse(res, { imageUrls }, `${imageUrls.length} images uploaded successfully`, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to upload images', 500);
  }
};

export const uploadProfileImage = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Check if file exists
    if (!req.file) {
      return errorResponse(res, 'No image file provided', 400);
    }

    // Upload to cloudinary
    const imageUrl = await uploadImage(req.file.buffer, 'profiles');

    return successResponse(res, { imageUrl }, 'Profile image uploaded successfully', 200);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to upload profile image', 500);
  }
};
