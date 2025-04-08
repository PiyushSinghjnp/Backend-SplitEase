import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';;

export const createGroup = async (req: Request, res: Response): Promise<void> => {
    const {userId, name, description } = req.body;
  
    try {
      const newGroup = await prisma.group.create({
        data: {
          name,
          description,
          createdById: userId,
        },
      });
      res.status(201).json(newGroup);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error creating group' });
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
  
