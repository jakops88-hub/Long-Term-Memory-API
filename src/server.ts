import { createServer } from 'http';
import { createApp } from './app';
import { env, logger, prisma } from './config';
import { getEmbeddingProvider } from './services/embeddings';
import { CronScheduler } from './config/cron';

const bootstrap = async () => {
  const embeddingProvider = getEmbeddingProvider();

  // Note: Using null for memoryService since we now use GraphRAG architecture
  // with direct Prisma calls in controllers/services
  const app = createApp({ memoryService: null as any, embeddingProvider });
  const server = createServer(app);

  // Initialize cron jobs (consolidation, pruning, health checks)
  CronScheduler.init();
  logger.info('Background jobs initialized');

  server.listen(env.port, () => {
    logger.info(`Memory-as-a-Service API listening on port ${env.port}`, { port: env.port });
  });
};

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: String(err) });
  process.exit(1);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  CronScheduler.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  CronScheduler.stop();
  await prisma.$disconnect();
  process.exit(0);
});
