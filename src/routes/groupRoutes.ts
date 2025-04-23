import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { createGroup, addGroupMember, getAllUserGroups, getGroupDetails } from '../controllers/groupController';
import {
  createGroupSchema,
  addGroupMemberSchema,
  getGroupDetailsSchema
} from '../types/schemas';
import { validate } from '../middlewares/validationMiddleware';

const router = Router();

// Create a new group
router.post('/create-group', authenticateToken, validate(createGroupSchema), createGroup);

// Add one or more members to a group
router.post('/:groupId/add-member', authenticateToken, validate(addGroupMemberSchema), addGroupMember);

// Get all user's groups with balances
router.get('/all', authenticateToken, getAllUserGroups);

// Get detailed group information
router.get('/:groupId', authenticateToken, validate(getGroupDetailsSchema), getGroupDetails);

export default router;