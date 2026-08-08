import { BaseRepository } from './base';
import { Customer } from '../types/entities';
import { logger } from '../utils/logger';

export class CustomerRepository extends BaseRepository {
  protected tableName = 'customers';

  async findByPhone(tenantId: string, phone: string): Promise<Customer | null> {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data as Customer;
    } catch (error) {
      logger.error('Error finding customer by phone:', error);
      throw error;
    }
  }

  async findByEmail(tenantId: string, email: string): Promise<Customer | null> {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('email', email)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data as Customer;
    } catch (error) {
      logger.error('Error finding customer by email:', error);
      throw error;
    }
  }

  async searchCustomers(
    tenantId: string,
    query: string,
    limit: number = 10
  ): Promise<Customer[]> {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(limit);
        
      if (error) {
        throw error;
      }
      
      return data as Customer[];
    } catch (error) {
      logger.error('Error searching customers:', error);
      throw error;
    }
  }

  async createCustomer(
    tenantId: string,
    customerData: Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<Customer> {
    return this.create<Customer>({
      ...customerData,
      tenant_id: tenantId
    } as any);
  }

  async updateCustomer(
    customerId: string,
    tenantId: string,
    updates: Partial<Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Customer> {
    return this.update<Customer>(customerId, tenantId, updates as any);
  }

  async getCustomer(customerId: string, tenantId: string): Promise<Customer | null> {
    return this.findById<Customer>(customerId, tenantId);
  }

  async getCustomers(
    tenantId: string,
    limit?: number,
    orderBy: string = 'created_at'
  ): Promise<Customer[]> {
    return this.findMany<Customer>(tenantId, {}, orderBy, limit);
  }
}
