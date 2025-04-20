import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { getUserBalancesInGroup } from '../utils/balanceUtils';
import { CustomRequest } from '../types/schemas';

export const createGroup = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Create group and add creator as member in a transaction
    const newGroup = await prisma.$transaction(async (prisma) => {
      // Create the group
      const group = await prisma.group.create({
        data: {
          name,
          description,
          createdById: userId,
        },
      });

      // Add creator as member
      await prisma.groupMember.create({
        data: {
          userId,
          groupId: group.id,
        },
      });

      return group;
    });

    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
};
  
export const addGroupMember = async (req: Request, res: Response): Promise<void> => {
  const { userId, groupId } = req.body;

  try {
    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if the user is already a member of the group
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({ error: 'User is already a member of this group' });
      return;
    }

    // Add the user to the group
    const newMember = await prisma.groupMember.create({
      data: {
        user: { connect: { id: userId } },
        group: { connect: { id: groupId } },
      },
    });

    res.status(201).json(newMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error adding group member' });
  }
};
  
export async function getAllUserGroups(req: CustomRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get all groups where user is a member or creator
    const groups = await prisma.group.findMany({
      where: {
        OR: [
          {
            members: {
              some: { userId }
            }
          },
          {
            createdById: userId
          }
        ]
      },
      include: {
        members: {
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

    // Get balances for each group using existing function
    const formattedGroups = await Promise.all(groups.map(async (group) => {
      const balances = await getUserBalancesInGroup(userId, group.id);
      
      // Calculate total balance
      const totalOwed = balances.youAreOwed.reduce((sum, balance) => sum + balance.amount, 0);
      const totalOwe = balances.youOwe.reduce((sum, balance) => sum + balance.amount, 0);
      const totalBalance = totalOwed - totalOwe;

      // Check if group is settled
      const isSettled = totalBalance === 0;

      return {
        id: group.id,
        name: group.name,
        totalBalance,
        status: isSettled ? 'settled up' : totalBalance > 0 ? 'you are owed' : 'you owe',
        amount: Math.abs(totalBalance),
        balances: [
          ...balances.youAreOwed.map(b => ({
            userId: b.userId,
            username: b.username,
            amount: b.amount,
            type: 'owes you'
          })),
          ...balances.youOwe.map(b => ({
            userId: b.userId,
            username: b.username,
            amount: b.amount,
            type: 'you owe'
          }))
        ],
        members: group.members.map(member => ({
          id: member.user.id,
          username: member.user.username
        }))
      };
    }));

    // Calculate overall balance
    const overallBalance = formattedGroups.reduce((sum, group) => sum + group.totalBalance, 0);

    res.json({
      overallBalance,
      groups: formattedGroups
    });

  } catch (error) {
    console.error('Error getting user groups:', error);
    res.status(500).json({ error: 'Failed to get user groups' });
  }
}

export async function getGroupDetails(req: CustomRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const groupId = req.params.groupId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Verify user is member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId
      }
    });
    console.log(membership);

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this group' });
      return;
    }

    // Get group details with expenses
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        expenses: {
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        members: {
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

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Get balances using existing function
    const balances = await getUserBalancesInGroup(userId, groupId);

    // Group expenses by month and year
    const expensesByMonth: Record<string, any[]> = {};
    group.expenses.forEach(expense => {
      const date = new Date(expense.createdAt);
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      
      const userSplit = expense.splits.find(split => split.userId === userId);
      const userShare = userSplit ? parseFloat(userSplit.share.toString()) : 0;
      const totalAmount = parseFloat(expense.amount.toString());

      let transactionType: 'you borrowed' | 'you lent' | 'not involved' = 'not involved';
      let transactionAmount = 0;

      if (expense.paidById === userId) {
        transactionType = 'you lent';
        transactionAmount = totalAmount - userShare;
      } else if (userShare > 0) {
        transactionType = 'you borrowed';
        transactionAmount = userShare;
      }

      const formattedExpense = {
        id: expense.id,
        description: expense.description,
        amount: totalAmount,
        date: expense.createdAt,
        day: date.getDate(),
        month: date.getMonth() + 1,
        paidBy: expense.paidBy,
        transactionType,
        transactionAmount,
        isInvolved: transactionType !== 'not involved'
      };

      if (!expensesByMonth[monthYear]) {
        expensesByMonth[monthYear] = [];
      }
      expensesByMonth[monthYear].push(formattedExpense);
    });

    // Calculate total balance
    const totalOwed = balances.youAreOwed.reduce((sum, balance) => sum + balance.amount, 0);
    const totalOwe = balances.youOwe.reduce((sum, balance) => sum + balance.amount, 0);
    const totalBalance = totalOwed - totalOwe;

    // Format individual balances
    const individualBalances = [
      ...balances.youAreOwed.map(balance => ({
        userId: balance.userId,
        username: balance.username,
        amount: balance.amount,
        type: 'owes you'
      })),
      ...balances.youOwe.map(balance => ({
        userId: balance.userId,
        username: balance.username,
        amount: balance.amount,
        type: 'you owe'
      }))
    ];

    res.json({
      id: group.id,
      name: group.name,
      totalBalance,
      balanceText: totalBalance > 0 ? `You are owed ₹${totalBalance.toFixed(2)} overall` : 
                   totalBalance < 0 ? `You owe ₹${Math.abs(totalBalance).toFixed(2)} overall` : 
                   'All settled up!',
      individualBalances: individualBalances.sort((a, b) => b.amount - a.amount),
      expensesByMonth,
      members: group.members.map(member => ({
        id: member.user.id,
        username: member.user.username
      }))
    });

  } catch (error) {
    console.error('Error getting group details:', error);
    res.status(500).json({ error: 'Failed to get group details' });
  }
}