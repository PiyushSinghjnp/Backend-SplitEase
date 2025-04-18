import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { createGroup, addGroupMember, getAllUserGroups, getGroupDetails } from '../controllers/groupController';
import { 
  createGroupSchema, 
  addGroupMemberSchema, 
  getGroupDetailsSchema,
  getAllUserGroupsSchema 
} from '../types/schemas';
import { validate } from '../middlewares/validationMiddleware';

const router = Router();

// Create a new group
router.post('/create-group', authenticateToken, validate(createGroupSchema), createGroup);

// Add a member to a group
router.post('/:groupId/add-member', authenticateToken, validate(addGroupMemberSchema), addGroupMember);

// Get all members of a group
// router.get('/:groupId/members', authenticateToken, getGroupMembers);

// // Get all expenses for a group
// router.get('/:groupId/expenses', authenticateToken, getGroupExpenses);
// Get all user's groups with balances
router.get('/all', authenticateToken, validate(getAllUserGroupsSchema), getAllUserGroups);

// Get detailed group information
router.get('/:groupId', authenticateToken, validate(getGroupDetailsSchema), getGroupDetails);

export default router;