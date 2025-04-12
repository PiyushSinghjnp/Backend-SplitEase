import { Router } from 'express';
import {createGroup,addGroupMember} from '../controllers/groupController';

const router = Router();

router.post('/create-group', createGroup);
router.post('/add-member', addGroupMember);

export default router;