import { config } from 'dotenv';
import { createServer } from './server';
import { logger } from './utils/logger';

// Load environment variables
config();

async function main() {
  try {
    // Create and start server
    const server = await createServer();
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`🚀 GaragePilot AI Server running on port ${port}`);
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

main();
