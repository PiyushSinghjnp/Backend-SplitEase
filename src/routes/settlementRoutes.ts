// src/routes/settlementRoutes.ts
import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import {
  getGroupSettlementOptions,
  recordSettlement,
  updateSettlementRecord,
  deleteSettlementRecord,
  getSettlementHistory
} from '../controllers/settlementController';
import { validate } from '../middlewares/validationMiddleware';
import { createSettlementSchema, updateSettlementSchema } from '../types/schemas';

const router = Router();

// Existing routes
router.get('/group/:groupId/options', authenticateToken, getGroupSettlementOptions);
router.post('/record', authenticateToken, validate(createSettlementSchema), recordSettlement);
router.get('/group/:groupId/history', authenticateToken, getSettlementHistory);

// New routes for updating and deleting settlements
router.put('/:settlementId', authenticateToken, validate(updateSettlementSchema), updateSettlementRecord);
router.delete('/:settlementId', authenticateToken, deleteSettlementRecord);

export default router;