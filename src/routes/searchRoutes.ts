import { Router } from 'express';
import { searchUsers } from '../controllers/searchController';

const router = Router();

// Search users
router.get('/search', searchUsers);

export default router;