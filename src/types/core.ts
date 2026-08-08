import { z } from 'zod';

// Core domain types
export const TenantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  settings: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserRoleSchema = z.enum([
  'OWNER',
  'MANAGER', 
  'RECEPTION',
  'MECHANIC',
  'ACCOUNTING',
  'READ_ONLY'
]);

export const UserSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: UserRoleSchema,
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ConversationSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  customerId: z.string().optional(),
  channel: z.string().min(1),
  channelUserId: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'TRANSFERRED']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const MessageSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  tenantId: z.string().min(1),
  content: z.string().min(1),
  role: z.enum(['USER', 'ASSISTANT', 'SYSTEM']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

export type Tenant = z.infer<typeof TenantSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type Message = z.infer<typeof MessageSchema>;
