import { z } from 'zod';

// Configuration schema
const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val)).default('3000'),
  
  // Database
  SUPABASE_URL: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // AI Configuration
  AI_PROVIDER: z.enum(['mistral', 'openai', 'claude']).default('mistral'),
  AI_MODEL: z.string().default('mistral-small'),
  AI_API_KEY: z.string().min(1),
  AI_BASE_URL: z.string().optional(),
  AI_TEMPERATURE: z.string().transform(val => parseFloat(val)).default('0.7'),
  AI_MAX_TOKENS: z.string().transform(val => parseInt(val)).default('1000'),
  
  // Security
  JWT_SECRET: z.string().min(1).optional(),
  RATE_LIMIT_WINDOW: z.string().transform(val => parseInt(val)).default('900000'), // 15 minutes
  RATE_LIMIT_MAX: z.string().transform(val => parseInt(val)).default('100'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

// Parse and validate environment variables
function loadConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  
  return result.data;
}

export const config = loadConfig();
