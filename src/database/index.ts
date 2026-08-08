import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';

export class Database {
  private static instance: Database;
  private supabase: SupabaseClient;
  
  private constructor() {
    this.supabase = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY
    );
  }
  
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  
  public getClient(): SupabaseClient {
    return this.supabase;
  }
  
  public async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('tenants')
        .select('id')
        .limit(1);
      
      if (error) {
        logger.error('Database health check failed:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Database connection error:', error);
      return false;
    }
  }
  
  public async initialize(): Promise<void> {
    logger.info('🗄️ Initializing database connection...');
    
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      throw new Error('Database connection failed');
    }
    
    logger.info('✅ Database connection established');
  }
}

export const database = Database.getInstance();
