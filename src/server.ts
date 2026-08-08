import fastify, { FastifyInstance } from 'fastify';
import { database } from './database';
import { logger } from './utils/logger';
import { config } from './config';

export async function createServer(): Promise<FastifyInstance> {
  const server = fastify({
    logger: true,
    disableRequestLogging: config.NODE_ENV === 'production'
  });

  // Initialize database connection
  await database.initialize();

  // Add CORS support
  await server.register(import('@fastify/cors'), {
    origin: true,
    credentials: true
  });

  // Add JSON support
  await server.register(import('@fastify/formbody'));

  // Health check endpoint
  server.get('/health', async (request, reply) => {
    try {
      const dbHealthy = await database.healthCheck();
      
      if (!dbHealthy) {
        return reply.status(503).send({ 
          status: 'unhealthy', 
          database: 'disconnected' 
        });
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        version: process.env.npm_package_version || '1.0.0'
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return reply.status(503).send({ 
        status: 'error', 
        message: 'Internal error' 
      });
    }
  });

  // Root endpoint
  server.get('/', async (request, reply) => {
    return {
      message: 'GaragePilot AI Server',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString()
    };
  });

  // Chat endpoint (temporary for testing)
  server.post('/chat', async (request, reply) => {
    const { message, tenantId, userId } = request.body as any;

    if (!message) {
      return reply.status(400).send({ error: 'Message is required' });
    }

    // TODO: Implement Pilot Core integration
    logger.info(`Received message:${message} from tenant: ${tenantId}`);

    // Temporary response
    return {
      response: "Bonjour ! Je suis GaragePilot AI, votre assistant IA. Comment puis-je vous aider aujourd'hui ?",
      conversationId: 'temp-123', // TODO: Generate real ID
      timestamp: new Date().toISOString()
    };
  });

  // Error handler
  server.setErrorHandler(async (error, request, reply) => {
    logger.error('Unhandled error:', error);
    
    const statusCode = error.statusCode || 500;
    const message = config.NODE_ENV === 'production' ? 'Internal Server Error' : error.message;

    reply.status(statusCode).send({
      error: message,
      timestamp: new Date().toISOString()
    });
  });

  return server;
}