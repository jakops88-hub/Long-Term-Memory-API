import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { memoryRoutes } from './routes/memoryRoutes';
import { sessionRoutes } from './routes/sessionRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { adminRoutes } from './routes/adminRoutes';
import asyncMemoryRoutes from './routes/asyncMemoryRoutes';
import billingRoutes from './routes/billingRoutes';
import graphRAGRoutes from './routes/graphRAGRoutes';
import webhookRoutes from './routes/webhookRoutes';
import publicStripeRoutes from './routes/publicStripeRoutes';
import userRoutes from './routes/userRoutes';
import { MemoryController } from './controllers/memoryController';
import { SessionController } from './controllers/sessionController';
import { HealthController } from './controllers/healthController';
import { AdminController } from './controllers/adminController';
import { EmbeddingProvider } from './services/embeddings/EmbeddingProvider';
import stripeRoutes from './routes/stripeRoutes';

export interface AppDependencies {
  memoryService: any; // Legacy - not used in GraphRAG architecture
  embeddingProvider?: EmbeddingProvider;
}

export const createApp = ({ memoryService, embeddingProvider }: AppDependencies) => {
  const app = express();

  app.use(helmet());
  
  // IMPORTANT: Webhook route MUST come BEFORE express.json()
  // Stripe needs raw body for signature verification
  app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);
  
  // FIX: Smartare CORS som tillåter alla dina Vercel-versioner
  app.use(
    cors({
      origin: (origin, callback) => {
        // Tillåt anrop utan origin (t.ex. från curl eller Postman)
        if (!origin) return callback(null, true);

        // Tillåt localhost för utveckling
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }

        // Tillåt alla dina Vercel-deployments (slutar på .vercel.app)
        if (origin.endsWith('.vercel.app')) {
          return callback(null, true);
        }

        // Annars, blockera
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
    })
  );
  
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);
  app.use(rateLimiter);

  const memoryController = new MemoryController(memoryService);
  const sessionController = new SessionController(memoryService);
  const healthController = new HealthController(embeddingProvider);
  const adminController = new AdminController(memoryService);

  app.get('/health', healthController.health);

  const apiRouter = express.Router();

  // Public routes (no authentication required)
  apiRouter.use('/public/stripe', publicStripeRoutes); // Public checkout

  // Montera routes
  apiRouter.use('/memory', memoryRoutes(memoryController));
  apiRouter.use('/memory', asyncMemoryRoutes); // Async ingestion
  apiRouter.use('/billing', billingRoutes); // Cost Guard & Billing
  apiRouter.use('/graphrag', graphRAGRoutes); // GraphRAG recursive retrieval
  apiRouter.use('/session', sessionRoutes(sessionController));
  apiRouter.use('/admin', adminRoutes(adminController));
  apiRouter.use('/stripe', stripeRoutes); // Stripe Billing Portal
  apiRouter.use('/user', userRoutes); // User management (me, api-keys)
  apiRouter.use(healthRoutes(healthController));

  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
};
