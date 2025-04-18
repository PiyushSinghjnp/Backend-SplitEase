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
import { 
  createSettlementSchema, 
  updateSettlementSchema,
  getSettlementHistorySchema,
  getSettlementOptionsSchema
} from '../types/schemas';

const router = Router();

// Get settlement options for a group
router.get('/group/:groupId/options', authenticateToken, validate(getSettlementOptionsSchema), getGroupSettlementOptions);

// Record a new settlement
router.post('/record', authenticateToken, validate(createSettlementSchema), recordSettlement);

// Update a settlement record
router.put('/:settlementId', authenticateToken, validate(updateSettlementSchema), updateSettlementRecord);

// Delete a settlement record
router.delete('/:settlementId', authenticateToken, deleteSettlementRecord);

// Get settlement history for a group
router.get('/history/:groupId', authenticateToken, validate(getSettlementHistorySchema), getSettlementHistory);

export default router;