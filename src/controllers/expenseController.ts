// src/controllers/expenseController.ts
import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { CustomRequest } from '../types/customRequest';
import { 
  updateBalancesForExpense, 
  removeBalancesForExpense, 
  getUserBalancesInGroup 
} from '../utils/balanceUtils';

export async function createExpense(req: CustomRequest, res: Response): Promise<void> {
  try {
    const { description, amount, groupId, splittingType, splits, participantIds, ratios, paidById } = req.body;
    const userId = req.user?.userId;

    // Now we should validate that group is existing or not 
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true }
    });

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }
    
    // Check if user is member of group or not 
    const isMember = group.members.some((member) => member.userId === userId);
    if (!isMember) {
      res.status(403).json({ message: "You are not a member of this group" });
      return;
    }
    
    // Determine who paid for the expense
    let actualPaidById = userId; // Default to the current user
    
    // If paidById is provided, validate that user is a member of the group
    if (paidById) {
      const isPaidByMember = group.members.some((member) => member.userId === paidById);
      if (!isPaidByMember) {
        res.status(400).json({ message: "The specified payer is not a member of this group" });
        return;
      }
      actualPaidById = paidById;
    }

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        paidById: actualPaidById,
        groupId
      }
    });

    // Handling different splitting types
    if (splittingType === "Equal") {
      // If participantIds is provided, use it to select specific members for equal splitting
      let selectedMembers = group.members;
      
      if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
        // Filter members to only include those in participantIds
        selectedMembers = group.members.filter(member => 
          participantIds.includes(member.userId)
        );
        
        // Validate that at least one member is selected
        if (selectedMembers.length === 0) {
          res.status(400).json({ message: "No valid participants selected for splitting" });
          return;
        }
      }
      
      const memberCount = selectedMembers.length;
      const shareAmount = amount / memberCount;
      
      // Create splits only for selected members
      const splitData = selectedMembers.map(member => ({
        expenseId: expense.id,
        userId: member.userId,
        share: shareAmount
      }));
      
      await prisma.expenseSplit.createMany({
        data: splitData
      });
    } else if (splittingType === "Ratio" && ratios && Array.isArray(ratios) && ratios.length > 0) {
      // Validate that all participants exist in the group
      const participantIds = ratios.map(ratio => ratio.userId);
      const validParticipants = group.members.filter(member => 
        participantIds.includes(member.userId)
      );
      
      if (validParticipants.length !== participantIds.length) {
        res.status(400).json({ message: "Some participants are not members of this group" });
        return;
      }
      
      // Calculate total ratio sum
      const totalRatio = ratios.reduce((sum, item) => sum + item.ratio, 0);
      
      if (totalRatio <= 0) {
        res.status(400).json({ message: "Total ratio must be greater than zero" });
        return;
      }
      
      // Calculate individual shares based on ratios
      const splitData = ratios.map(ratio => {
        const share = (ratio.ratio / totalRatio) * amount;
        return {
          expenseId: expense.id,
          userId: ratio.userId,
          share: parseFloat(share.toFixed(2)) // Round to 2 decimal places
        };
      });
      
      await prisma.expenseSplit.createMany({
        data: splitData
      });
    } else if (splittingType === "custom" && splits && Array.isArray(splits)) {
      const splitData = splits.map(split => ({
        expenseId: expense.id,
        userId: split.userId,
        share: split.share
      }));
      
      await prisma.expenseSplit.createMany({
        data: splitData
      });
    } else {
      res.status(400).json({ message: "Invalid splitting type or missing splitting data" });
      return;
    }
    
    // Update if  balance exist otherwise create a new balance
    await updateBalancesForExpense(expense.id);

    // Get the complete expense with payer details to return in the response
    const completeExpense = await prisma.expense.findUnique({
      where: { id: expense.id },
      include: {
        paidBy: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Expense created successfully',
      expense: completeExpense
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
}

export async function updateExpense(req: CustomRequest, res: Response): Promise<void> {
  try {
    const { expenseId } = req.params;
    const { description, amount, splittingType, splits, participantIds, ratios, paidById } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        group: {
          include: { members: true }
        },
        splits: true
      }
    });
    
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    
    // Handle paidById update
    let newPaidById = expense.paidById;
    
    if (paidById) {
      // Validate the new payer is a group member
      const isPaidByMember = expense.group.members.some((member) => member.userId === paidById);
      if (!isPaidByMember) {
        res.status(400).json({ message: "The specified payer is not a member of this group" });
        return;
      }
      newPaidById = paidById;
    }
    
    // Update expense basic details 
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: description || expense.description,
        amount: amount ? parseFloat(amount) : expense.amount,
        paidById: newPaidById
      }
    });

    // If the amount changed or splitting type changed then update the splits
    if (amount && amount !== expense.amount || splittingType) {
      // Delete existing splits
      await prisma.expenseSplit.deleteMany({
        where: { expenseId }
      });
      
      if (splittingType === "Equal") {
        // If participantIds is provided, use it to select specific members for equal splitting
        let selectedMembers = expense.group.members;
        
        if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
          // Filter members to only include those in participantIds
          selectedMembers = expense.group.members.filter(member => 
            participantIds.includes(member.userId)
          );
          
          // Validate that at least one member is selected
          if (selectedMembers.length === 0) {
            res.status(400).json({ message: "No valid participants selected for splitting" });
            return;
          }
        }
        
        const memberCount = selectedMembers.length;
        const shareAmount = (amount || expense.amount) / memberCount;
        
        // Create splits only for selected members
        const splitData = selectedMembers.map(member => ({
          expenseId,
          userId: member.userId,
          share: shareAmount
        }));
        
        await prisma.expenseSplit.createMany({
          data: splitData
        });
      } else if (splittingType === "Ratio" && ratios && Array.isArray(ratios) && ratios.length > 0) {
        // Validate that all participants exist in the group
        const participantIds = ratios.map(ratio => ratio.userId);
        const validParticipants = expense.group.members.filter(member => 
          participantIds.includes(member.userId)
        );
        
        if (validParticipants.length !== participantIds.length) {
          res.status(400).json({ message: "Some participants are not members of this group" });
          return;
        }
        
        // Calculate total ratio sum
        const totalRatio = ratios.reduce((sum, item) => sum + item.ratio, 0);
        
        if (totalRatio <= 0) {
          res.status(400).json({ message: "Total ratio must be greater than zero" });
          return;
        }
        
        // Calculate individual shares based on ratios
        const expenseAmount = amount || expense.amount;
        const splitData = ratios.map(ratio => {
          const share = (ratio.ratio / totalRatio) * expenseAmount;
          return {
            expenseId,
            userId: ratio.userId,
            share: parseFloat(share.toFixed(2)) // Round to 2 decimal places
          };
        });
        
        await prisma.expenseSplit.createMany({
          data: splitData
        });
      } else if (splittingType === "custom" && splits && Array.isArray(splits)) {
        const splitData = splits.map(split => ({
          expenseId,
          userId: split.userId,
          share: parseFloat(split.share)
        }));
        
        await prisma.expenseSplit.createMany({
          data: splitData
        });
      } else if (!splittingType && splits && Array.isArray(splits)) {
        // Just update the splits without changing the splitting type i.e changed only the amount 
        const splitData = splits.map(split => ({
          expenseId,
          userId: split.userId,
          share: parseFloat(split.share)
        }));

        await prisma.expenseSplit.createMany({
          data: splitData
        });
      }
      
      // Recalculate balances for this expense
      await updateBalancesForExpense(expenseId, true);
    } else if (paidById && paidById !== expense.paidById) {
      // If only the payer changed but not the amount or splitting type,
      // we still need to recalculate balances
      await updateBalancesForExpense(expenseId, true);
    }
    
    const finalExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        paidBy: {
          select: {
            id: true,
            username: true
          }
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });
    
    res.json({
      message: 'Expense updated successfully',
      expense: finalExpense
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
}

export async function deleteExpense(req: CustomRequest, res: Response): Promise<void> {
  try {
    const { expenseId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    // Find if expense exists
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });
    
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    
    // Remove balances for this expense first
    await removeBalancesForExpense(expenseId);
    
    // Delete the expense splits
    await prisma.expenseSplit.deleteMany({
      where: { expenseId }
    });
    
    // Delete the expense
    await prisma.expense.delete({
      where: { id: expenseId }
    });
    
    res.json({
      message: "Expense deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
}

export async function getGroupExpenseSummary(req: CustomRequest, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Verify the group exists and user is a member
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true
      }
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const isMember = group.members.some(member => member.userId === userId);
    if (!isMember) {
      res.status(403).json({ error: 'You are not a member of this group' });
      return;
    }

    // Get user's balances in this group
    const userBalances = await getUserBalancesInGroup(userId, groupId);

    // Get expenses for this group
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        paidBy: {
          select: {
            id: true,
            username: true
          }
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    // Format expenses to show whether current user borrowed or lent on each expense 
    const formattedExpenses = expenses.map(expense => {
      // Find user's share in this expense
      const userSplit = expense.splits.find(split => split.userId === userId);
      const userShare = userSplit ? userSplit.share : 0; // if the user spent for the expense then get his share
      
      let transactionType;
      let transactionAmount;
      
      if (expense.paidById === userId) {
        // User paid for this expense
        transactionType = "you lent";
        transactionAmount = parseFloat(expense.amount.toString()) - parseFloat(userShare.toString());
      } else {
        // User didn't pay
        transactionType = "you borrowed";
        transactionAmount = parseFloat(userShare.toString());
      }
      
      // Format the date for display
      const expenseDate = new Date(expense.createdAt);
      
      // every expense will return the below 
      return {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        date: expenseDate,
        paidBy: {
          id: expense.paidBy.id,
          username: expense.paidBy.username
        },
        transactionType,
        transactionAmount
      };
    });

    res.json({
      group: {
        id: group.id,
        name: group.name
      },
      summary: userBalances,
      expenses: formattedExpenses
    });
  } catch (error) {
    console.error('Error getting group expense summary:', error);
    res.status(500).json({ error: 'Failed to get group expense summary' });
  }
}

 // function to see the detail of every expense created
export async function getExpenseDetail(req: CustomRequest, res: Response): Promise<void> {
  try {
    const { expenseId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get the expense with all related data
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        group: true,
        paidBy: {
          select: {
            id: true,
            username: true
          }
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    // Verify user is member of the expense's group
    const isMember = await prisma.groupMember.findFirst({
      where: {
        groupId: expense.groupId,
        userId: userId
      }
    });

    if (!isMember) {
      res.status(403).json({ error: 'You are not authorized to view this expense' });
      return;
    }

    // Process the splits to calculate who owes what
    const splits = expense.splits.map(split => {
      let relationship;
      
      if (split.userId === userId) {
        relationship = 'you';
      } else if (expense.paidById === split.userId) {
        relationship = 'paid';
      } else {
        relationship = split.userId === expense.paidById ? 'paid' : 'owes';
      }
      
      return {
        user: split.user,
        share: split.share,
        relationship
      };
    });

    // Calculate net transactions between users based on this expense
    const transactions = [];
    
    if (expense.paidById !== userId) {
      // Current user owes the payer for their share
      const userSplit = expense.splits.find(split => split.userId === userId);
      
      if (userSplit) {
        transactions.push({
          from: {
            id: userId,
            username: 'You'
          },
          to: {
            id: expense.paidBy.id,
            username: expense.paidBy.username
          },
          amount: userSplit.share
        });
      }
    } else {
      // Current user is the payer, others owe them
      expense.splits.forEach(split => {
        if (split.userId !== userId) {
          transactions.push({
            from: {
              id: split.user.id,
              username: split.user.username
            },
            to: {
              id: userId,
              username: 'You'
            },
            amount: split.share
          });
        }
      });
    }

    res.json({
      expense: {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        date: expense.createdAt,
        group: {
          id: expense.group.id,
          name: expense.group.name
        },
        paidBy: expense.paidBy
      },
      splits,
      transactions
    });
  } catch (error) {
    console.error('Error getting expense detail:', error);
    res.status(500).json({ error: 'Failed to get expense detail' });
  }
}