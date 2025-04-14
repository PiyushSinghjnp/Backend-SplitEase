import { Router } from 'express';
import { searchUsers } from '../controllers/searchController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Search users
router.get('/search', authenticateToken, searchUsers);

export default router;