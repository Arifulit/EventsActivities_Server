import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { UserRole } from '../middleware/role.middleware';
import { config } from '../config/env';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };
  accessToken: string;
}

export class AuthService {
  static async register(data: RegisterData): Promise<AuthResponse> {
    const { fullName, email, password, role = UserRole.USER } = data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await user.save();

    // Generate JWT accessToken
    const accessToken = this.generateToken(user);

    return {
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      accessToken
    };
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Find user by email
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT accessToken
    const accessToken = this.generateToken(user);

    return {
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      accessToken
    };
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    await user.save();
  }

  static async resetPassword(email: string): Promise<void> {
    // Find user by email
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return;
    }

    // Generate reset token (in a real app, you'd send this via email)
    const resetToken = this.generateResetToken(user);
    
    // For now, just log it (in production, send email)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    // You would typically:
    // 1. Save reset token to user record with expiration
    // 2. Send reset email with token
    // 3. Create reset endpoint that validates token
  }

  static async refreshToken(userId: string): Promise<string> {
    // Find user
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new token
    return this.generateToken(user);
  }

  static async validateToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      
      // Verify user still exists and is active
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  private static generateToken(user: any): string {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    } as jwt.SignOptions);
  }

  private static generateResetToken(user: any): string {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      type: 'password_reset'
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: '1h' // Reset tokens expire in 1 hour
    } as jwt.SignOptions);
  }

  static async updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.role = newRole;
    user.updatedAt = new Date();
    await user.save();
  }

  static async deactivateUser(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = false;
    user.updatedAt = new Date();
    await user.save();
  }

  static async activateUser(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = true;
    user.updatedAt = new Date();
    await user.save();
  }
}