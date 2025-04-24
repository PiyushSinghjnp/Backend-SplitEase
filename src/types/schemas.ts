import { z } from 'zod';
import { Request } from 'express';

// User schemas
export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

// Group schemas
export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Group name must be at least 3 characters'),
    description: z.string().optional()
  })
});

export const addGroupMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID').optional(),
    userIds: z.array(z.string().uuid('Invalid user ID')).optional(),
    groupId: z.string().uuid('Invalid group ID')
  })
  .refine(data => data.userId !== undefined || (data.userIds !== undefined && data.userIds.length > 0), {
    message: 'Either userId or userIds must be provided',
    path: ['body']
  })
});

// Expense schemas
export const createExpenseSchema = z.object({
  body: z.object({
    description: z.string().min(3, 'Description must be at least 3 characters'),
    amount: z.number().positive('Amount must be positive'),
    groupId: z.string().uuid('Invalid group ID'),
    splittingType: z.enum(['Equal', 'custom', 'Ratio']),
    splits: z.array(z.object({
      userId: z.string().uuid('Invalid user ID'),
      share: z.number().positive('Share must be positive')
    })).optional(),
    participantIds: z.array(z.string().uuid('Invalid user ID')).optional(),
    ratios: z.array(z.object({
      userId: z.string().uuid('Invalid user ID'),
      ratio: z.number().int().positive('Ratio must be a positive integer')
    })).optional()
  })
});

export const updateExpenseSchema = z.object({
  body: z.object({
    description: z.string().min(3, 'Description must be at least 3 characters').optional(),
    amount: z.number().positive('Amount must be positive').optional(),
    splittingType: z.enum(['Equal', 'custom', 'Ratio']).optional(),
    splits: z.array(z.object({
      userId: z.string().uuid('Invalid user ID'),
      share: z.number().positive('Share must be positive')
    })).optional(),
    participantIds: z.array(z.string().uuid('Invalid user ID')).optional(),
    ratios: z.array(z.object({
      userId: z.string().uuid('Invalid user ID'),
      ratio: z.number().int().positive('Ratio must be a positive integer')
    })).optional()
  })
});

// Friend request schemas
export const sendFriendRequestSchema = z.object({
  body: z.object({
    receiverId: z.string().uuid('Invalid user ID')
  })
});

export const respondFriendRequestSchema = z.object({
  body: z.object({
    status: z.enum(['ACCEPTED', 'REJECTED'])
  })
});

// Search schema
export const searchSchema = z.object({
  user: z.string().min(1, 'Search query is required')
});

// Custom request type with user
export interface CustomRequest extends Request {
  user?: {
    userId: string;
  };
}

// Settlement schemas
export const createSettlementSchema = z.object({
  body: z.object({
    groupId: z.string().uuid('Invalid group ID'),
    paidToId: z.string().uuid('Invalid user ID'),
    amount: z.number()
      .positive('Amount must be positive')
      .min(0.01, 'Amount must be at least 0.01')
  })
});

export const updateSettlementSchema = z.object({
  body: z.object({
    amount: z.number()
      .positive('Amount must be positive')
      .min(0.01, 'Amount must be at least 0.01')
  })
});

// Auth schemas
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  })
});

// Group schemas
export const getGroupDetailsSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID')
  })
});

// Search schemas
export const searchUsersSchema = z.object({
  query: z.object({
    user: z.string().min(1, 'Search query is required')
  })
});

// Friend schemas
export const getFriendRequestsSchema = z.object({
  user: z.object({
    userId: z.string().uuid('Invalid user ID')
  }).optional(),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

export const getFriendsListSchema = z.object({
  user: z.object({
    userId: z.string().uuid('Invalid user ID')
  }).optional(),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

// Settlement schemas
export const getSettlementHistorySchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID')
  })
});

export const getSettlementOptionsSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID')
  })
});