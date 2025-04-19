import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { CustomRequest } from '../types/customRequest';
import { getBulkRelationshipStatus } from '../utils/relationshipUtils';

export const searchUsers = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.user as string;
    const userId = req.user?.userId;

    if (!query || query.trim() === '') {
      res.status(400).json({ error: 'Search Query is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
        id: {
          not: userId
        }
      },
      take: 10,
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    // Get relationship status for all found users
    const relationshipMap = await getBulkRelationshipStatus(
      userId,
      users.map(user => user.id)
    );

    // Enhance users with their relationship status
    const enhancedUsers = users.map(user => ({
      ...user,
      relationshipStatus: relationshipMap.get(user.id) || 'NOT_CONNECTED'
    }));

    res.json({ users: enhancedUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// i will send the json as follwing 
// {
//   "users": [
//     {
//       "id": "user123",
//       "username": "john_doe",
//       "email": "john@example.com",
//       "relationshipStatus": "FRIENDS" 
//     },
//     {
//       "id": "user456",
//       "username": "jane_smith",
//       "email": "jane@example.com",
//       "relationshipStatus": "REQUEST_SENT"
//     },
//     {
//       "id": "user789",
//       "username": "alex_wong",
//       "email": "alex@example.com",
//       "relationshipStatus": "NOT_CONNECTED"
//     }
//   ]
// }