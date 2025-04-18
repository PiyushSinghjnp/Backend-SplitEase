import { z } from 'zod';
import { Request } from 'express';

// User schemas
export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Group schemas
export const createGroupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters'),
  description: z.string().optional()
});

export const addGroupMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  groupId: z.string().uuid('Invalid group ID')
});

// Expense schemas
export const createExpenseSchema = z.object({
  description: z.string().min(3, 'Description must be at least 3 characters'),
  amount: z.number().positive('Amount must be positive'),
  groupId: z.string().uuid('Invalid group ID'),
  splittingType: z.enum(['Equal', 'custom']),
  splits: z.array(z.object({
    userId: z.string().uuid('Invalid user ID'),
    share: z.number().positive('Share must be positive')
  })).optional()
});

export const updateExpenseSchema = z.object({
  description: z.string().min(3, 'Description must be at least 3 characters').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  splittingType: z.enum(['Equal', 'custom']).optional(),
  splits: z.array(z.object({
    userId: z.string().uuid('Invalid user ID'),
    share: z.number().positive('Share must be positive')
  })).optional()
});

// Friend request schemas
export const sendFriendRequestSchema = z.object({
  receiverId: z.string().uuid('Invalid user ID')
});

export const respondFriendRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED'])
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
  groupId: z.string().uuid('Invalid group ID'),
  paidToId: z.string().uuid('Invalid user ID'),
  amount: z.number()
    .positive('Amount must be positive')
    .min(0.01, 'Amount must be at least 0.01')
});

export const updateSettlementSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(0.01, 'Amount must be at least 0.01')
});

// Auth schemas
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// Group schemas
export const getGroupDetailsSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID')
  })
});

export const getAllUserGroupsSchema = z.object({
  user: z.object({
    userId: z.string().uuid('Invalid user ID')
  })
});

// Search schemas
export const searchUsersSchema = z.object({
  query: z.object({
    searchTerm: z.string().min(1, 'Search term is required')
  })
});

// Friend schemas
export const getFriendRequestsSchema = z.object({
  user: z.object({
    userId: z.string().uuid('Invalid user ID')
  })
});

export const getFriendsListSchema = z.object({
  user: z.object({
    userId: z.string().uuid('Invalid user ID')
  })
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