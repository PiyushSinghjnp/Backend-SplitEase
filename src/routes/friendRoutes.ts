import { Router } from 'express';
import { sendFriendRequest, respondFriendRequest, getFriends } from '../controllers/friendController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// POST /api/friend-requests: Send a friend request
router.post('/friend-requests', authenticateToken, sendFriendRequest);

// PUT /api/friend-requests/:id: Respond to a friend request (accept or reject)
router.put('/friend-requests/:id', authenticateToken, respondFriendRequest);

// GET /api/friends: Get the authenticated user's friend list
router.get('/friends', authenticateToken, getFriends);

export default router;