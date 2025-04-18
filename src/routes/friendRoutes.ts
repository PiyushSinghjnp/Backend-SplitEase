import { Router } from 'express';
import { sendFriendRequest, respondFriendRequest, getFriends, getUserRelationship, getPendingRequests } from '../controllers/friendController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { sendFriendRequestSchema, respondFriendRequestSchema } from '../types/schemas';
import { validate } from '../middlewares/validationMiddleware';

const router = Router();

// Send a friend request
router.post('/requests', authenticateToken, validate(sendFriendRequestSchema), sendFriendRequest);

// Respond to a friend request
router.put('/requests/:id', authenticateToken, validate(respondFriendRequestSchema), respondFriendRequest);

// Get all friends
router.get('/friends', authenticateToken, getFriends);

// Get relationship status with a user
router.get('/relationship/:userId', authenticateToken, getUserRelationship);

// Get pending friend requests
router.get('/requests/pending', authenticateToken, getPendingRequests);

export default router;