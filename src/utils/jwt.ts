import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';

export interface JwtPayload {
  id: string;
  role: string;
}

export const generateToken = (userId: string, role: string = 'user'): string => {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn };
  return jwt.sign(
    { id: userId, role }, 
    config.jwtSecret, 
    options
  );
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, config.jwtSecret);
};

export const generateRefreshToken = (userId: string): string => {
  const options: SignOptions = { expiresIn: '30d' };
  return jwt.sign(
    { id: userId, role: 'user' }, 
    config.jwtSecret, 
    options
  );
};