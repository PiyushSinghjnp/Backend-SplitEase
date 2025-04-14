import { Router } from 'express';
import { sendFriendRequest, respondFriendRequest, getFriends, getUserRelationship, getPendingRequests } from '../controllers/friendController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Send a friend request
router.post('/requests', authenticateToken, sendFriendRequest);

// Respond to a friend request (accept or reject)
router.put('/requests/:id', authenticateToken, respondFriendRequest);

// Get the authenticated user's friend list
router.get('/', authenticateToken, getFriends);

// Get relationship status with another user
router.get('/relationship/:targetUserId', authenticateToken, getUserRelationship);

// Get all pending friend requests
router.get('/requests/pending', authenticateToken, getPendingRequests);

export default router;