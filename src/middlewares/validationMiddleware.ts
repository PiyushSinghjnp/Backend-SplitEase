import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
import { CustomRequest } from '../types/schemas';

export const validate = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customReq = req as CustomRequest;
      const validationData = {
        body: req.body || {},
        query: req.query || {},
        params: req.params || {},
        user: customReq.user || undefined
      };

      // Parse the schema and handle validation errors
      const result = await schema.safeParseAsync(validationData);
      
      if (!result.success) {
        res.status(400).json(result.error);
        return;
      }

      next();
    } catch (error) {
      console.error('Validation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }; 