import prisma from './prismaClient';

export type RelationshipStatus = 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'NOT_CONNECTED';

export async function getUserRelationshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<{ status: RelationshipStatus; requestId?: string }> {
  // Check if they are friends
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { user1Id: currentUserId, user2Id: targetUserId },
        { user1Id: targetUserId, user2Id: currentUserId }
      ]
    }
  });

  if (friendship) {
    return { status: 'FRIENDS' };
  }

  // Check for pending requests
  const sentRequest = await prisma.friendRequest.findFirst({
    where: {
      senderId: currentUserId,
      receiverId: targetUserId,
      status: 'PENDING'
    }
  });

  if (sentRequest) {
    return { status: 'REQUEST_SENT' };
  }

  const receivedRequest = await prisma.friendRequest.findFirst({
    where: {
      senderId: targetUserId,
      receiverId: currentUserId,
      status: 'PENDING'
    }
  });

  if (receivedRequest) {
    return { 
      status: 'REQUEST_RECEIVED',
      requestId: receivedRequest.id 
    };
  }

  return { status: 'NOT_CONNECTED' };
}

export async function getBulkRelationshipStatus(
  currentUserId: string,
  targetUserIds: string[]
): Promise<Map<string, RelationshipStatus>> {
  // Get all friendships
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { user1Id: currentUserId, user2Id: { in: targetUserIds } },
        { user2Id: currentUserId, user1Id: { in: targetUserIds } }
      ]
    }
  });

  // Get all pending requests
  const sentRequests = await prisma.friendRequest.findMany({
    where: {
      senderId: currentUserId,
      receiverId: { in: targetUserIds },
      status: 'PENDING'
    }
  });

  const receivedRequests = await prisma.friendRequest.findMany({
    where: {
      receiverId: currentUserId,
      senderId: { in: targetUserIds },
      status: 'PENDING'
    }
  });

  // Create a map of user IDs to their relationship status
  const relationshipMap = new Map<string, RelationshipStatus>();

  // Initialize all users as NOT_CONNECTED
  targetUserIds.forEach(id => relationshipMap.set(id, 'NOT_CONNECTED'));

  // Update status for friends
  friendships.forEach(friendship => {
    const friendId = friendship.user1Id === currentUserId ? friendship.user2Id : friendship.user1Id;
    relationshipMap.set(friendId, 'FRIENDS');
  });

  // Update status for sent requests
  sentRequests.forEach(request => {
    relationshipMap.set(request.receiverId, 'REQUEST_SENT');
  });

  // Update status for received requests
  receivedRequests.forEach(request => {
    relationshipMap.set(request.senderId, 'REQUEST_RECEIVED');
  });

  return relationshipMap;
}

// Map(3) {
//     "user123" => "FRIENDS",
//     "user456" => "REQUEST_SENT",
//     "user789" => "NOT_CONNECTED"
//   }

// The user with ID "user123" is friends with the current user
// The current user has sent a friend request to the user with ID "user456"
// There's no relationship with the user with ID "user789"