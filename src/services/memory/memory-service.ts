import { database } from '../../database';
import { logger } from '../../utils/logger';
import { nanoid } from 'nanoid';

export interface MemoryEntry {
  id: string;
  tenantId: string;
  key: string;
  value: any;
  type: 'customer_context' | 'conversation_state' | 'user_preference' | 'business_data' | 'session_data';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMemory {
  customerId?: string;
  customerName?: string;
  vehicleInfo?: {
    make: string;
    model: string;
    year?: number;
    licensePlate?: string;
  };
  lastServiceType?: string;
  preferences?: Record<string, any>;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentIntent?: string;
  appointmentInProgress?: {
    serviceType?: string;
    preferredDate?: string;
    preferredTime?: string;
    duration?: number;
  };
}

export class MemoryService {
  private static instance: MemoryService;
  private readonly tableName = 'memory_entries';

  private constructor() {}

  static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  async store(
    tenantId: string,
    key: string,
    value: any,
    type: MemoryEntry['type'],
    expiresAt?: Date
  ): Promise<void> {
    try {
      const db = database.getClient();
      const now = new Date();
      
      // Upsert memory entry
      const { error } = await db
        .from(this.tableName)
        .upsert({
          id: nanoid(),
          tenant_id: tenantId,
          key,
          value: JSON.stringify(value),
          type,
          expires_at: expiresAt?.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'tenant_id,key'
        });

      if (error) {
        throw error;
      }

      logger.debug('Memory stored successfully', { tenantId, key, type });
    } catch (error) {
      logger.error('Failed to store memory:', error);
      throw error;
    }
  }

  async retrieve<T = any>(
    tenantId: string,
    key: string
  ): Promise<T | null> {
    try {
      const db = database.getClient();
      
      const { data, error } = await db
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('key', key)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          return null;
        }
        throw error;
      }

      return JSON.parse(data.value) as T;
    } catch (error) {
      logger.error('Failed to retrieve memory:', error);
      throw error;
    }
  }

  async storeConversationMemory(
    tenantId: string,
    conversationId: string,
    memory: ConversationMemory
  ): Promise<void> {
    const key = `conversation:${conversationId}`;
    await this.store(tenantId, key, memory, 'conversation_state');
  }

  async getConversationMemory(
    tenantId: string,
    conversationId: string
  ): Promise<ConversationMemory | null> {
    const key = `conversation:${conversationId}`;
    return await this.retrieve<ConversationMemory>(tenantId, key);
  }

  async updateConversationMemory(
    tenantId: string,
    conversationId: string,
    updates: Partial<ConversationMemory>
  ): Promise<void> {
    const existing = await this.getConversationMemory(tenantId, conversationId) || {
      conversationHistory: []
    };
    
    const updated: ConversationMemory = {
      ...existing,
      ...updates,
      conversationHistory: [
        ...existing.conversationHistory,
        ...(updates.conversationHistory || [])
      ]
    };

    await this.storeConversationMemory(tenantId, conversationId, updated);
  }

  async storeCustomerContext(
    tenantId: string,
    customerId: string,
    context: Record<string, any>
  ): Promise<void> {
    const key = `customer:${customerId}`;
    await this.store(tenantId, key, context, 'customer_context');
  }

  async getCustomerContext(
    tenantId: string,
    customerId: string
  ): Promise<Record<string, any> | null> {
    const key = `customer:${customerId}`;
    return await this.retrieve(tenantId, key);
  }

  async cleanup(tenantId: string): Promise<void> {
    try {
      const db = database.getClient();
      
      // Delete expired entries
      const { error } = await db
        .from(this.tableName)
        .delete()
        .eq('tenant_id', tenantId)
        .lt('expires_at', new Date().toISOString());

      if (error) {
        throw error;
      }

      logger.info('Memory cleanup completed', { tenantId });
    } catch (error) {
      logger.error('Memory cleanup failed:', error);
      throw error;
    }
  }
}

export const memoryService = MemoryService.getInstance();
