import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/dashboard', authenticateToken, (req,res) => {
  const user = (req as any).user; // Access the user information from the token
  res.status(200).json({ message: 'Welcome to the dashboard!', user });
});

export default router;