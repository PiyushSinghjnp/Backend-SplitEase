import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { 
    createExpense, 
    getGroupExpenseSummary, 
    getExpenseDetail,
    updateExpense,
    deleteExpense 
} from '../controllers/expenseController';
import { createExpenseSchema, updateExpenseSchema } from '../types/schemas';
import { validate } from '../middlewares/validationMiddleware';

const router = Router();

// Create a new expense with dynamic splitting and group validation
router.post('/create', authenticateToken, validate(createExpenseSchema), createExpense);

// Get expense summary for a group
router.get('/group/:groupId/summary', authenticateToken, getGroupExpenseSummary);

// Get detailed view of a specific expense
router.get('/:expenseId', authenticateToken, getExpenseDetail);

// Update an existing expense
router.put('/:expenseId', authenticateToken, validate(updateExpenseSchema), updateExpense);

// Delete an expense
router.delete('/:expenseId', authenticateToken, deleteExpense);

export default router;


