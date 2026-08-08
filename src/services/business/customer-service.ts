import { CustomerRepository } from '../../repositories/customer-repository';
import { Customer } from '../../types/entities';
import { logger } from '../../utils/logger';
import { memoryService } from '../memory/memory-service';

export class CustomerService {
  private customerRepo: CustomerRepository;
  private static instance: CustomerService;

  private constructor() {
    this.customerRepo = new CustomerRepository();
  }

  static getInstance(): CustomerService {
    if (!CustomerService.instance) {
      CustomerService.instance = new CustomerService();
    }
    return CustomerService.instance;
  }

  async findCustomerByPhone(tenantId: string, phone: string): Promise<Customer | null> {
    try {
      return await this.customerRepo.findByPhone(tenantId, phone);
    } catch (error) {
      logger.error('Failed to find customer by phone:', error);
      throw error;
    }
  }

  async findCustomerByEmail(tenantId: string, email: string): Promise<Customer | null> {
    try {
      return await this.customerRepo.findByEmail(tenantId, email);
    } catch (error) {
      logger.error('Failed to find customer by email:', error);
      throw error;
    }
  }

  async searchCustomers(tenantId: string, query: string): Promise<Customer[]> {
    try {
      return await this.customerRepo.searchCustomers(tenantId, query);
    } catch (error) {
      logger.error('Failed to search customers:', error);
      throw error;
    }
  }

  async createCustomer(
    tenantId: string,
    customerData: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      address?: string;
      notes?: string;
      preferences?: Record<string, any>;
    }
  ): Promise<Customer> {
    try {
      const customer = await this.customerRepo.createCustomer(tenantId, customerData);
      
      // Store customer context in memory
      await memoryService.storeCustomerContext(tenantId, customer.id, {
        name: `${customer.firstName} ${customer.lastName}`,
        contact: {
          email: customer.email,
          phone: customer.phone
        },
        preferences: customer.preferences || {},
        createdAt: new Date()
      });
      
      logger.info('Customer created successfully', {
        customerId: customer.id,
        tenantId,
        name: `${customer.firstName} ${customer.lastName}`
      });
      
      return customer;
    } catch (error) {
      logger.error('Failed to create customer:', error);
      throw error;
    }
  }

  async updateCustomer(
    tenantId: string,
    customerId: string,
    updates: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address: string;
      notes: string;
      preferences: Record<string, any>;
    }>
  ): Promise<Customer> {
    try {
      const customer = await this.customerRepo.updateCustomer(customerId, tenantId, updates);
      
      // Update customer context in memory
      await memoryService.storeCustomerContext(tenantId, customer.id, {
        name: `${customer.firstName} ${customer.lastName}`,
        contact: {
          email: customer.email,
          phone: customer.phone
        },
        preferences: customer.preferences || {},
        updatedAt: new Date()
      });
      
      logger.info('Customer updated successfully', { customerId, tenantId });
      
      return customer;
    } catch (error) {
      logger.error('Failed to update customer:', error);
      throw error;
    }
  }

  async getCustomer(tenantId: string, customerId: string): Promise<Customer | null> {
    try {
      return await this.customerRepo.getCustomer(customerId, tenantId);
    } catch (error) {
      logger.error('Failed to get customer:', error);
      throw error;
    }
  }

  async identifyCustomerFromMessage(
    tenantId: string,
    message: string
  ): Promise<Customer | null> {
    try {
      // Simple extraction logic - can be enhanced with NLP
      const phoneRegex = /(?:\+33|0)[1-9](?:[0-9]{8})/g;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      
      const phones = message.match(phoneRegex);
      const emails = message.match(emailRegex);
      
      // Try phone first
      if (phones && phones.length > 0) {
        for (const phone of phones) {
          const customer = await this.findCustomerByPhone(tenantId, phone);
          if (customer) {
            return customer;
          }
        }
      }
      
      // Try email
      if (emails && emails.length > 0) {
        for (const email of emails) {
          const customer = await this.findCustomerByEmail(tenantId, email);
          if (customer) {
            return customer;
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to identify customer from message:', error);
      return null;
    }
  }
}

export const customerService = CustomerService.getInstance();
