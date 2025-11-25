import { Router } from 'express';
import { z } from 'zod';
import { MemoryController } from '../controllers/memoryController';
import { validate } from '../middleware/validate';
import { env } from '../config';

export const memoryRoutes = (controller: MemoryController) => {
  const router = Router();

  // Schema för att spara minnen
  const storeSchema = z.object({
    body: z.object({
      sessionId: z.string().min(1),
      text: z.string().min(1).max(env.maxTextLength),
      metadata: z.record(z.any()).optional(),
      importanceHint: z.enum(['low', 'medium', 'high']).optional()
    })
  });

  // Schema för att hämta/söka minnen
  const retrieveSchema = z.object({
    body: z.object({
      sessionId: z.string().min(1),
      query: z.string().min(1).max(env.maxTextLength),
      limit: z.number().int().positive().max(50).optional(),
      metadata: z.record(z.any()).optional()
    })
  });

  // Schema för att radera minnen
  const clearSchema = z.object({
    body: z.object({
      sessionId: z.string().min(1),
      memoryIds: z.array(z.string().min(1)).optional()
    })
  });

  // --- DEFINIERA RUTTER ---
  
  // POST /api/memory/store
  router.post('/store', validate(storeSchema), controller.store);

  // POST /api/memory/retrieve
  router.post('/retrieve', validate(retrieveSchema), controller.retrieve);

  // POST /api/memory/search (Alias för retrieve, för att matcha din frontend)
  router.post('/search', validate(retrieveSchema), controller.retrieve);

  // POST /api/memory/clear
  router.post('/clear', validate(clearSchema), controller.clear);

  return router;
};
