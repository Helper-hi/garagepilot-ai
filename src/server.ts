import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config';
import { logger } from './utils/logger';
import { database } from './database';

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: false, // We use Winston instead
    trustProxy: true,
    requestIdLogLabel: 'requestId',
    genReqId: () => {
      return Math.random().toString(36).substring(2, 15);
    }
  });

  // Health check
  server.get('/health', async (request, reply) => {
    const isDbHealthy = await database.healthCheck();
    
    if (!isDbHealthy) {
      reply.status(503);
      return { status: 'unhealthy', database: false };
    }
    
    return { 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: true,
      version: '1.0.0'
    };
  });

  // Initialize database
  await database.initialize();
  
  // Register routes
  await registerRoutes(server);
  
  return server;
}

async function registerRoutes(server: FastifyInstance) {
  // API routes will be added here
  server.register(async function(fastify) {
    fastify.get('/api/status', async () => {
      return { message: 'GaragePilot AI is running', timestamp: new Date().toISOString() };
    });
  });
}
