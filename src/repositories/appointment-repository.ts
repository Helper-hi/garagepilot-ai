import { BaseRepository } from './base';
import { Appointment, AppointmentStatus } from '../types/entities';
import { logger } from '../utils/logger';

export class AppointmentRepository extends BaseRepository {
  protected tableName = 'appointments';

  async findByCustomer(
    tenantId: string,
    customerId: string,
    limit?: number
  ): Promise<Appointment[]> {
    try {
      let query = this.db
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .order('scheduled_at', { ascending: false });
        
      if (limit) {
        query = query.limit(limit);
      }
        
      const { data, error } = await query;
        
      if (error) {
        throw error;
      }
      
      return data as Appointment[];
    } catch (error) {
      logger.error('Error finding appointments by customer:', error);
      throw error;
    }
  }

  async findByDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    status?: AppointmentStatus
  ): Promise<Appointment[]> {
    try {
      let query = this.db
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())
        .order('scheduled_at', { ascending: true });
        
      if (status) {
        query = query.eq('status', status);
      }
        
      const { data, error } = await query;
        
      if (error) {
        throw error;
      }
      
      return data as Appointment[];
    } catch (error) {
      logger.error('Error finding appointments by date range:', error);
      throw error;
    }
  }

  async checkAvailability(
    tenantId: string,
    scheduledAt: Date,
    duration: number
  ): Promise<boolean> {
    try {
      const endTime = new Date(scheduledAt.getTime() + duration * 60000); // duration in minutes
      
      const { data, error } = await this.db
        .from(this.tableName)
        .select('id')
        .eq('tenant_id', tenantId)
        .in('status', ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'])
        .or(`and(scheduled_at.lte.${scheduledAt.toISOString()},scheduled_at_end.gt.${scheduledAt.toISOString()}),and(scheduled_at.lt.${endTime.toISOString()},scheduled_at_end.gte.${endTime.toISOString()}),and(scheduled_at.gte.${scheduledAt.toISOString()},scheduled_at.lte.${endTime.toISOString()})`)
        .limit(1);
        
      if (error) {
        throw error;
      }
      
      return data.length === 0;
    } catch (error) {
      logger.error('Error checking appointment availability:', error);
      throw error;
    }
  }

  async createAppointment(
    tenantId: string,
    appointmentData: Omit<Appointment, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<Appointment> {
    return this.create<Appointment>({
      ...appointmentData,
      tenant_id: tenantId
    } as any);
  }

  async updateAppointment(
    appointmentId: string,
    tenantId: string,
    updates: Partial<Omit<Appointment, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Appointment> {
    return this.update<Appointment>(appointmentId, tenantId, updates as any);
  }

  async getAppointment(appointmentId: string, tenantId: string): Promise<Appointment | null> {
    return this.findById<Appointment>(appointmentId, tenantId);
  }

  async getTodayAppointments(tenantId: string): Promise<Appointment[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    return this.findByDateRange(tenantId, startOfDay, endOfDay);
  }
}
