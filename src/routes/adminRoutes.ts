import { Router } from 'express';
import { z } from 'zod';
import { AdminController } from '../controllers/adminController';
import { validate } from '../middleware/validate';
import { adminAuth } from '../middleware/adminAuth';

export const adminRoutes = (controller: AdminController) => {
  const router = Router();

  const pruneSchema = z.object({
    body: z
      .object({
        maxAgeDays: z.number().positive().optional(),
        inactiveDays: z.number().positive().optional(),
        importanceThreshold: z.number().min(0).max(1).optional(),
        take: z.number().int().positive().max(1000).optional()
      })
      .optional()
  });

  router.post('/admin/prune', adminAuth, validate(pruneSchema), controller.prune);

  /**
   * POST /api/admin/consolidate
   * Trigger memory consolidation (Sleep Cycles)
   * 
   * Body (optional):
   * - userId: string - Consolidate specific user
   */
  router.post('/admin/consolidate', adminAuth, controller.consolidate);

  return router;
};
