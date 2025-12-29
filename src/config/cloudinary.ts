import { v2 as cloudinary } from 'cloudinary';
import { config } from './env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

// Upload image to Cloudinary
export const uploadImage = async (imagePath: string, folder: string = 'events-platform'): Promise<any> => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      max_file_size: 5000000, // 5MB
      transformation: [
        { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

// Upload multiple images
export const uploadMultipleImages = async (imagePaths: string[], folder: string = 'events-platform'): Promise<any[]> => {
  try {
    const uploadPromises = imagePaths.map(imagePath => uploadImage(imagePath, folder));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Cloudinary multiple upload error:', error);
    throw new Error('Failed to upload images to Cloudinary');
  }
};

// Delete image from Cloudinary
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

// Delete multiple images
export const deleteMultipleImages = async (publicIds: string[]): Promise<void> => {
  try {
    await cloudinary.api.delete_resources(publicIds);
  } catch (error) {
    console.error('Cloudinary multiple delete error:', error);
    throw new Error('Failed to delete images from Cloudinary');
  }
};

// Get image info
export const getImageInfo = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      createdAt: result.created_at
    };
  } catch (error) {
    console.error('Cloudinary get info error:', error);
    throw new Error('Failed to get image info from Cloudinary');
  }
};

// Generate optimized image URL
export const getOptimizedImageUrl = (publicId: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  crop?: string;
  format?: string;
} = {}): string => {
  const {
    width = 800,
    height = 600,
    quality = 'auto',
    crop = 'limit',
    format = 'auto'
  } = options;

  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop, quality, fetch_format: format }
    ]
  });
};

// Generate thumbnail URL
export const getThumbnailUrl = (publicId: string, size: number = 200): string => {
  return cloudinary.url(publicId, {
    transformation: [
      { width: size, height: size, crop: 'thumb', gravity: 'face', quality: 'auto' }
    ]
  });
};

export default cloudinary;