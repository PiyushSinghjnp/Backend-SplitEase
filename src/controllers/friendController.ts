import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { CustomRequest } from '../types/customRequest';
import { getUserRelationshipStatus } from '../utils/relationshipUtils';
// import { i, re } from 'mathjs';

export async function sendFriendRequest(req:CustomRequest,res:Response):Promise<void>{
    try {
      const senderId = req.user?.userId; // assuming req.user is populated by auth middleware
    
      const { receiverId } = req.body;
  
      // Verify the receiver exists:
      const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
      if (!receiver) {
        res.status(404).json({ error: 'Receiver not found' });
        return;
      }
  
      // Check if there's already a pending friend request from sender to receiver
      const existingRequest = await prisma.friendRequest.findFirst({
        where: {
          senderId,
          receiverId,
          status: 'PENDING'
        }
      });

      if (existingRequest) {
        res.status(400).json({ error: 'Friend request already pending' });
        return;
      }
  
      // Optionally, check if a friendship already exists
      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: senderId, user2Id: receiverId },
            { user1Id: receiverId, user2Id: senderId }
          ]
        }
      });
  
      if (existingFriendship) {
        res.status(400).json({ error: 'You are already friends with this user' });
        return;
      }
  
      // Create a friend request
      const friendRequest = await prisma.friendRequest.create({
        data: { senderId, receiverId }
      });
  
      res.json({ message: 'Friend request sent', friendRequest });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to send friend request' });
    }
  }

export async function respondFriendRequest(req: CustomRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    console.log('Friend Request ID:', id);
    const { status } = req.body; // should be either 'ACCEPTED' or 'REJECTED'

    // Validate the friend request exists
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id },
    });

    if (!friendRequest) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    const { senderId, receiverId } = friendRequest;

    // Check if users are already friends
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: senderId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: senderId },
        ],
      },
    });

    if (existingFriendship) {
      res.status(400).json({ error: 'You are already friends with this user' });
      return;
    }

    // Update friend request status
    const updatedRequest = await prisma.friendRequest.update({
      where: { id },
      data: { status },
    });

    // If accepted, create a Friendship record
    if (status === 'ACCEPTED') {
      const [user1Id, user2Id] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

      // Create a new friendship record
      await prisma.friendship.create({
        data: { user1Id, user2Id },
      });
    }

    res.json({ message: 'Friend request updated', updatedRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update friend request' });
  }
}
  
export async function getFriends(req: CustomRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    });
  // now the frinship obejct will retuen the data whom the user is friend with but user can be in user1id or user2id so we need to filter the data to get the friends of the user
  // we get the user's friends id  from the friendship object and then we get the data of the user from the user table using the id of the user in the friendship object
  const friendIds = friendships.map(friendship => (friendship.user1Id === userId ? friendship.user2Id : friendship.user1Id));
  const friends = await prisma.user.findMany({ where: { id: { in: friendIds } } });
  res.json(friends);
} catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Failed to get friend list' });
}
}

// this function will get the relationship status of the two users
export async function getUserRelationship(req: CustomRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { targetUserId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const relationship = await getUserRelationshipStatus(userId, targetUserId);
    res.json(relationship);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get user relationship' });
  }
}

// the get pending request fuction is to show all the pending request of the user in the friend request page
// helps when showing the pending request in notification of anywhere else 
export async function getPendingRequests(req: CustomRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
//     A section for "Friend Requests Received" (using the sender details)
// A section for "Friend Requests Sent" (using the receiver details)
//     // Get received pending requests with sender details
    const receivedRequests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING'
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    // if wanted to show the list of request sent by the user
    const sentRequests = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: 'PENDING'
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    res.json({
      received: receivedRequests,
      sent: sentRequests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
}
