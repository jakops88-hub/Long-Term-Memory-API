import { Request, Response, NextFunction } from 'express';
import { GraphRAGService } from '../services/graphRAGService';
import { z } from 'zod';
import { ApiError } from '../types/errors';

const retrieveSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  query: z.string().min(1, 'query is required'),
  maxMemories: z.number().int().min(1).max(20).optional(),
  maxEntities: z.number().int().min(1).max(20).optional(),
  graphDepth: z.number().int().min(1).max(5).optional(),
  minSimilarity: z.number().min(0).max(1).optional()
});

export class GraphRAGController {
  constructor(private graphRAGService: GraphRAGService) {}

  /**
   * POST /api/graphrag/retrieve
   * Perform GraphRAG retrieval with multi-hop reasoning
   */
  async retrieve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const options = retrieveSchema.parse(req.body);

      const startTime = Date.now();
      const result = await this.graphRAGService.retrieve(options);
      const duration = Date.now() - startTime;

      res.json({
        query: options.query,
        userId: options.userId,
        
        // Statistics
        stats: {
          memoriesFound: result.memories.length,
          entitiesFound: result.entities.length,
          graphNodesTraversed: result.graphNodes.length,
          totalTokens: result.totalTokens,
          durationMs: duration
        },

        // Results
        memories: result.memories,
        entities: result.entities,
        graphNodes: result.graphNodes,
        
        // Synthesized context for LLM
        context: result.contextSummary
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ApiError({
          code: 'VALIDATION_ERROR',
          status: 400,
          message: 'Invalid request data',
          details: { errors: error.errors } as Record<string, unknown>
        }));
      } else {
        next(error);
      }
    }
  }
}
