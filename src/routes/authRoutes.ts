import { Router } from 'express';
import { registerUser, loginUser  } from '../controllers/authController';
import {createGroup,addGroupMember} from '../controllers/groupController';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/create-group', createGroup);
router.post('/add-member', addGroupMember);

export default router;