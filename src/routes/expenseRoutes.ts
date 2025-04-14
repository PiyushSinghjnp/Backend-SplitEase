import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { 
    createExpense, 
    getGroupExpenseSummary, 
    getExpenseDetail,
    updateExpense,
    deleteExpense 
} from '../controllers/expenseController';

const router = Router();

// Create a new expense with dynamic splitting and group validation
router.post('/create-expense', authenticateToken, createExpense);

// Get all expenses for a group with a personalized summary
router.get('/group/:groupId', authenticateToken, getGroupExpenseSummary);

// Get full detailed breakdown of a specific expense
router.get('/:expenseId', authenticateToken, getExpenseDetail);

// Update an existing expense
router.put('/:expenseId', authenticateToken, updateExpense);

// Delete an expense
router.delete('/:expenseId', authenticateToken, deleteExpense);

export default router;


