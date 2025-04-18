// src/controllers/settlementController.ts
import { Request, Response } from 'express';
import { CustomRequest } from '../types/customRequest';
import prisma from '../utils/prismaClient';
import { recalculateGroupBalances } from '../utils/balanceUtils';

export async function getGroupSettlementOptions(req: CustomRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get all balances in the group where the user is involved
    const balances = await prisma.balance.findMany({
      where: {
        groupId,
        OR: [
          { lenderId: userId },
          { borrowerId: userId }
        ]
      },
      include: {
        lender: {
          select: {
            id: true,
            username: true
          }
        },
        borrower: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    // Format the balances for the response
    const settlementOptions = balances.map(balance => {
      const isLender = balance.lenderId === userId;
      return {
        userId: isLender ? balance.borrowerId : balance.lenderId,
        username: isLender ? balance.borrower.username : balance.lender.username,
        amount: parseFloat(balance.amount.toString()),
        type: isLender ? 'you are owed' : 'you owe'
      };
    });

    res.json({ settlementOptions });
  } catch (error) {
    console.error('Error getting settlement options:', error);
    res.status(500).json({ error: 'Failed to get settlement options' });
  }
}

export async function recordSettlement(req: CustomRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { groupId, paidToId, amount } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Record the settlement
    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        paidById: userId,
        paidToId,
        amount: parseFloat(amount),
        createdAt: new Date()
      }
    });

    // Immediately recalculate group balances
    await recalculateGroupBalances(groupId);

    res.status(201).json({
      message: 'Payment recorded successfully',
      settlement
    });
  } catch (error) {
    console.error('Error recording settlement:', error);
    res.status(500).json({ error: 'Failed to record settlement' });
  }
}

export async function getSettlementHistory(req: CustomRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const settlements = await prisma.settlement.findMany({
      where: {
        groupId,
        OR: [
          { paidById: userId },
          { paidToId: userId }
        ]
      },
      include: {
        paidBy: {
          select: {
            id: true,
            username: true
          }
        },
        paidTo: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ settlements });
  } catch (error) {
    console.error('Error getting settlement history:', error);
    res.status(500).json({ error: 'Failed to get settlement history' });
  }
}
// src/controllers/settlementController.ts

// Add this function to the existing controller
export async function updateSettlementRecord(req: CustomRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { settlementId } = req.params;
      const { amount } = req.body;
  
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
  
      // Get the existing settlement
      const existingSettlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: {
          paidBy: {
            select: {
              id: true,
              username: true
            }
          },
          paidTo: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });
  
      if (!existingSettlement) {
        res.status(404).json({ error: 'Settlement not found' });
        return;
      }
  
      // Check if user is involved in the settlement
      if (existingSettlement.paidById !== userId && existingSettlement.paidToId !== userId) {
        res.status(403).json({ error: 'Not authorized to update this settlement' });
        return;
      }
  
      // Update the settlement
      const updatedSettlement = await prisma.settlement.update({
        where: { id: settlementId },
        data: {
          amount: parseFloat(amount)
        },
        include: {
          paidBy: {
            select: {
              id: true,
              username: true
            }
          },
          paidTo: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });
  
      // Recalculate group balances
      await recalculateGroupBalances(existingSettlement.groupId);
  
      res.json({
        message: 'Settlement updated successfully',
        settlement: updatedSettlement
      });
  
    } catch (error) {
      console.error('Error updating settlement:', error);
      res.status(500).json({ error: 'Failed to update settlement' });
    }
  }
  
  // Add delete function as well for completeness
  export async function deleteSettlementRecord(req: CustomRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { settlementId } = req.params;
  
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
  
      // Get the settlement
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId }
      });
  
      if (!settlement) {
        res.status(404).json({ error: 'Settlement not found' });
        return;
      }
  
      // Check if user is involved in the settlement
      if (settlement.paidById !== userId && settlement.paidToId !== userId) {
        res.status(403).json({ error: 'Not authorized to delete this settlement' });
        return;
      }
  
      // Delete the settlement
      await prisma.settlement.delete({
        where: { id: settlementId }
      });
  
      // Recalculate group balances
      await recalculateGroupBalances(settlement.groupId);
  
      res.json({
        message: 'Settlement deleted successfully'
      });
  
    } catch (error) {
      console.error('Error deleting settlement:', error);
      res.status(500).json({ error: 'Failed to delete settlement' });
    }
  }
