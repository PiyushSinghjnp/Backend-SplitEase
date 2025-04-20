import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomRequest } from '../types/customRequest';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: 'Access denied. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1]; // Extract the token from "Bearer <token>"

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as CustomRequest).user = decoded as { userId: string };
    next(); // Pass control to the next middleware or route handler
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};