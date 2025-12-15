import { Request, Response, NextFunction } from 'express';
import { ConsolidationService } from '../services/consolidationService';
import { z } from 'zod';

const consolidateSchema = z.object({
  userId: z.string().optional()
});

export class AdminController {
  constructor(private memoryService: any) {} // Legacy parameter, not used

  prune = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.memoryService.pruneOldMemories(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/admin/consolidate
   * Manually trigger memory consolidation
   * 
   * Body (optional):
   * - userId: string - Consolidate specific user (if omitted, consolidates all eligible users)
   */
  consolidate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = consolidateSchema.parse(req.body);

      if (data.userId) {
        // Consolidate specific user
        const result = await ConsolidationService.consolidateUser(data.userId);
        res.json({
          message: 'User consolidation completed',
          result
        });
      } else {
        // Consolidate all eligible users
        const results = await ConsolidationService.consolidateAllUsers();
        res.json({
          message: 'Batch consolidation completed',
          totalUsers: results.length,
          successful: results.filter(r => !r.skipped).length,
          skipped: results.filter(r => r.skipped).length,
          results
        });
      }
    } catch (err) {
      next(err);
    }
  };
}
