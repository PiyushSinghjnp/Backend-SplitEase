import { Router } from 'express';
import { sendFriendRequest, respondFriendRequest, getFriends } from '../controllers/friendController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

//  Send a friend request
router.post('/friend-requests', authenticateToken, sendFriendRequest);

//  Respond to a friend request (accept or reject)
router.put('/friend-requests/:id', authenticateToken, respondFriendRequest);

// Get the authenticated user's friend list
router.get('/friends', authenticateToken, getFriends);

export default router;