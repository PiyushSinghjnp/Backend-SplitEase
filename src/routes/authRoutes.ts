import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController';
import { createGroup, addGroupMember } from '../controllers/groupController';
import { registerSchema, loginSchema } from '../types/schemas';
import { validate } from '../middlewares/validationMiddleware';

const router = Router();

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/create-group', createGroup);
router.post('/add-member', addGroupMember);

export default router;