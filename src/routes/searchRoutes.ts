import { Router } from 'express';
import { searchUsers } from '../controllers/searchController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { searchSchema } from '../types/schemas';
import { validate } from '../middlewares/validationMiddleware';

const router = Router();

// Search users
router.get('/search', authenticateToken, validate(searchSchema), searchUsers);

export default router;