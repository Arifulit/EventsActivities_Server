import { Request, Response, CookieOptions } from 'express';
import { User } from '../models/user.model';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';
import { config } from '../config/env';
import { uploadImage } from '../services/cloudinary.service';

const isProduction = config.nodeEnv === 'production';
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax'
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.cookie('refreshToken', refreshToken, {
    ...baseCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken', baseCookieOptions);
  res.clearCookie('refreshToken', baseCookieOptions);
};

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { fullName, email, password, role, location, city } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 400);
    }

    const user = await User.create({
      fullName,
      email,
      password,
      role: role || UserRole.USER,
      location: location || { city: city || 'Unknown' }
    });

    const accessToken = generateToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    setAuthCookies(res, accessToken, refreshToken);

    return successResponse(
      res,
      { user, accessToken, refreshToken },
      'Registration successful',
      201
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const accessToken = generateToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    setAuthCookies(res, accessToken, refreshToken);

    return successResponse(res, { user, accessToken, refreshToken }, 'Login successful');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    return successResponse(res, req.user, 'User retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { fullName, bio, interests, location, profileImage } = req.body;
    
    // Build update object with only provided fields
    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;
    if (interests !== undefined) updateData.interests = interests;
    if (location !== undefined) updateData.location = location;
    if (profileImage !== undefined) updateData.profileImage = profileImage;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, updatedUser, 'Profile updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getProfileCompleteness = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    let completeness = 0;
    const missingFields: string[] = [];

    // Calculate profile completeness
    if (user.fullName) completeness += 20;
    else missingFields.push('fullName');

    if (user.email) completeness += 20;
    else missingFields.push('email');

    if (user.profileImage) completeness += 20;
    else missingFields.push('profileImage');

    if (user.bio) completeness += 15;
    else missingFields.push('bio');

    if (user.interests && user.interests.length > 0) completeness += 15;
    else missingFields.push('interests');

    if (user.location && user.location.city) completeness += 10;
    else missingFields.push('location');

    return successResponse(res, { 
      completeness, 
      missingFields,
      isComplete: completeness === 100 
    }, 'Profile completeness retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return errorResponse(res, 'Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Generate new tokens
    const newAccessToken = generateToken(user._id.toString(), user.role);
    const newRefreshToken = generateRefreshToken(user._id.toString());

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return successResponse(res, { 
      accessToken: newAccessToken, 
      refreshToken: newRefreshToken 
    }, 'Token refreshed successfully');
  } catch (error: any) {
    return errorResponse(res, 'Invalid refresh token', 401);
  }
};

export const logout = async (req: Request, res: Response): Promise<any> => {
  try {
    // In a real implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Remove the refresh token from database
    // 3. Clear cookies if using cookies
    
    return successResponse(res, null, 'Logout successful');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const uploadProfileImage = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No image file provided', 400);
    }

    // Upload image to Cloudinary
    const imageUrl = await uploadImage(req.file.buffer, 'profile-images');

    // Update user profile image
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: imageUrl },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, { profileImage: imageUrl, user: updatedUser }, 'Profile image uploaded successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};