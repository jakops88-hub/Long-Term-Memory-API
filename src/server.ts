import { createServer } from 'http';
import { createApp } from './app';
import { env, logger, prisma } from './config';
import { MemoryRepository } from './repositories/memoryRepository';
import { SessionRepository } from './repositories/sessionRepository';
import { MemoryService } from './services/memoryService';
import { OpenAIEmbeddingProvider } from './services/embeddings/OpenAIEmbeddingProvider';

const bootstrap = async () => {
  const memoryRepository = new MemoryRepository();
  const sessionRepository = new SessionRepository();
  const embeddingProvider = new OpenAIEmbeddingProvider();
  const memoryService = new MemoryService(memoryRepository, sessionRepository, embeddingProvider);

  const app = createApp({ memoryService, embeddingProvider });
  const server = createServer(app);

  server.listen(env.port, () => {
    logger.info(`Memory-as-a-Service API listening on port ${env.port}`, { port: env.port });
  });
};

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: String(err) });
  process.exit(1);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
