import { SupabaseClient } from '@supabase/supabase-js';
import { database } from '../database';
import { logger } from '../utils/logger';
import { nanoid } from 'nanoid';

export abstract class BaseRepository {
  protected db: SupabaseClient;
  protected abstract tableName: string;
  
  constructor() {
    this.db = database.getClient();
  }
  
  protected generateId(): string {
    return nanoid();
  }
  
  protected async findById<T>(id: string, tenantId: string): Promise<T | null> {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          return null;
        }
        throw error;
      }
      
      return data as T;
    } catch (error) {
      logger.error(`Error finding ${this.tableName} by id:`, error);
      throw error;
    }
  }
  
  protected async findMany<T>(
    tenantId: string, 
    filters?: Record<string, any>,
    orderBy?: string,
    limit?: number
  ): Promise<T[]> {
    try {
      let query = this.db
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId);
      
      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }
      
      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy);
      }
      
      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data as T[];
    } catch (error) {
      logger.error(`Error finding ${this.tableName}:`, error);
      throw error;
    }
  }
  
  protected async create<T>(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'> & { tenant_id: string }
  ): Promise<T> {
    try {
      const record = {
        id: this.generateId(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: created, error } = await this.db
        .from(this.tableName)
        .insert(record)
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      return created as T;
    } catch (error) {
      logger.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
  }
  
  protected async update<T>(
    id: string,
    tenantId: string,
    updates: Partial<Omit<T, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
  ): Promise<T> {
    try {
      const record = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await this.db
        .from(this.tableName)
        .update(record)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      return data as T;
    } catch (error) {
      logger.error(`Error updating ${this.tableName}:`, error);
      throw error;
    }
  }
  
  protected async delete(id: string, tenantId: string): Promise<void> {
    try {
      const { error } = await this.db
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
        
      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error(`Error deleting ${this.tableName}:`, error);
      throw error;
    }
  }
}
