import { z } from 'zod';

// Memory and Knowledge types
export const MemoryEntrySchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  customerId: z.string().optional(),
  conversationId: z.string().optional(),
  key: z.string().min(1),
  value: z.unknown(),
  type: z.enum(['CUSTOMER_PREFERENCE', 'CONVERSATION_CONTEXT', 'BUSINESS_FACT', 'TEMPORARY']),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const KnowledgeEntrySchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()),
  isActive: z.boolean(),
  priority: z.number().min(0).max(10),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;

// Memory and Knowledge interfaces
export interface IMemoryService {
  get(tenantId: string, key: string, customerId?: string): Promise<MemoryEntry | null>;
  set(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  delete(tenantId: string, key: string, customerId?: string): Promise<void>;
  search(tenantId: string, query: string, customerId?: string): Promise<MemoryEntry[]>;
  cleanup(): Promise<void>; // Remove expired entries
}

export interface IKnowledgeService {
  search(tenantId: string, query: string, category?: string): Promise<KnowledgeEntry[]>;
  get(tenantId: string, id: string): Promise<KnowledgeEntry | null>;
  create(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeEntry>;
  update(tenantId: string, id: string, updates: Partial<KnowledgeEntry>): Promise<KnowledgeEntry>;
  delete(tenantId: string, id: string): Promise<void>;
}
