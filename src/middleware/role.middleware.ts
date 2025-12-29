import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/user.model';

export enum UserRole {
  USER = 'user',
  HOST = 'host',
  ADMIN = 'admin'
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Normalize to lowercase/trim to avoid casing or whitespace mismatch
    const requestedRole = (req.user.role as string | undefined)?.toString().trim().toLowerCase();
    const allowed = allowedRoles.map(r => r.toLowerCase());

    if (!requestedRole || !allowed.includes(requestedRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

export const requireUser = requireRole([UserRole.USER]);
export const requireHost = requireRole([UserRole.HOST]);
export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireUserOrHost = requireRole([UserRole.USER, UserRole.HOST]);
export const requireHostOrAdmin = requireRole([UserRole.HOST, UserRole.ADMIN]);
export const requireAnyRole = requireRole([UserRole.USER, UserRole.HOST, UserRole.ADMIN]);

export const isOwnerOrAdmin = (resourceOwnerIdField: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const resourceOwnerId = req.params[resourceOwnerIdField] || req.body[resourceOwnerIdField];
    
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    if (req.user.id === resourceOwnerId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only access your own resources'
    });
  };
};

export const isEventHostOrAdmin = (eventHostIdField: string = 'hostId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const eventHostId = req.params[eventHostIdField] || req.body[eventHostIdField];
    
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    if (req.user.role === UserRole.HOST && req.user.id === eventHostId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only manage your own events'
    });
  };
};