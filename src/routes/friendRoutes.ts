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

// Get friends list
router.get('/list', authenticateToken, getFriends);

// Get user relationship status
router.get('/relationship/:targetUserId', authenticateToken, getUserRelationship);

// Get pending friend requests
router.get('/pending', authenticateToken, getPendingRequests);

export default router;