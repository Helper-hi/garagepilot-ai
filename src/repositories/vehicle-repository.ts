import { BaseRepository } from './base';
import { Vehicle } from '../types/entities';
import { logger } from '../utils/logger';

export class VehicleRepository extends BaseRepository {
  protected tableName = 'vehicles';

  async findByCustomer(tenantId: string, customerId: string): Promise<Vehicle[]> {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      return data as Vehicle[];
    } catch (error) {
      logger.error('Error finding vehicles by customer:', error);
      throw error;
    }
  }

  async findByLicensePlate(tenantId: string, licensePlate: string): Promise<Vehicle | null> {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('license_plate', licensePlate)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data as Vehicle;
    } catch (error) {
      logger.error('Error finding vehicle by license plate:', error);
      throw error;
    }
  }

  async createVehicle(
    tenantId: string,
    vehicleData: Omit<Vehicle, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<Vehicle> {
    return this.create<Vehicle>({
      ...vehicleData,
      tenant_id: tenantId
    } as any);
  }

  async updateVehicle(
    vehicleId: string,
    tenantId: string,
    updates: Partial<Omit<Vehicle, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Vehicle> {
    return this.update<Vehicle>(vehicleId, tenantId, updates as any);
  }

  async getVehicle(vehicleId: string, tenantId: string): Promise<Vehicle | null> {
    return this.findById<Vehicle>(vehicleId, tenantId);
  }
}
