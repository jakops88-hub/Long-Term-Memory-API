import { Request, Response, NextFunction } from 'express';
import { prisma, redis } from '../config';
import { EmbeddingProvider } from '../services/embeddings/EmbeddingProvider';

export class HealthController {
  constructor(private embeddingProvider?: EmbeddingProvider) {}

  health = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const dbStatus = await prisma
        .$queryRaw`SELECT 1 as ok`
        .then(() => 'ok')
        .catch(() => 'error');

      // Test Redis connection
      const redisStatus = await redis
        .ping()
        .then(() => 'ok')
        .catch(() => 'error');

      res.json({
        status: 'ok',
        db: dbStatus,
        redis: redisStatus,
        embeddings: this.embeddingProvider?.isEnabled() ? 'enabled' : 'disabled',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  };
}
