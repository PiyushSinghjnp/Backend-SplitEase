import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import {createGroup,addGroupMember} from '../controllers/groupController';

const router = Router();

router.post('/create-group', authenticateToken,createGroup);
router.post('/add-member',authenticateToken, addGroupMember);

export default router;