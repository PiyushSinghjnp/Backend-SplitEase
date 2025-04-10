import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface CustomRequest extends Request {
  user?: JwtPayload | { userId: string }; // Adjust the type of id as needed
}