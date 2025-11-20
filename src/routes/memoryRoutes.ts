import { Router } from 'express';
import { z } from 'zod';
import { MemoryController } from '../controllers/memoryController';
import { validate } from '../middleware/validate';
import { env } from '../config';

export const memoryRoutes = (controller: MemoryController) => {
  const router = Router();

  const storeSchema = z.object({
    body: z.object({
      sessionId: z.string().min(1),
      text: z.string().min(1).max(env.maxTextLength),
      metadata: z.record(z.any()).optional(),
      importanceHint: z.enum(['low', 'medium', 'high']).optional()
    })
  });

  const retrieveSchema = z.object({
    body: z.object({
      sessionId: z.string().min(1),
      query: z.string().min(1).max(env.maxTextLength),
      limit: z.number().int().positive().max(50).optional(),
      metadata: z.record(z.any()).optional()
    })
  });

  const clearSchema = z.object({
    body: z.object({
      sessionId: z.string().min(1),
      memoryIds: z.array(z.string().min(1)).optional()
    })
  });

  router.post('/memory/store', validate(storeSchema), controller.store);
  router.post('/memory/retrieve', validate(retrieveSchema), controller.retrieve);
  router.post('/memory/clear', validate(clearSchema), controller.clear);

  return router;
};
