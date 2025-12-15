import { Request, Response, NextFunction } from 'express';
import { memoryProcessingQueue } from '../config/queue';
import { z } from 'zod';
import { ApiError } from '../types/errors';
import { AuthenticatedRequest } from '../middleware/hybridAuth';

const addMemorySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  text: z.string().min(1, 'text is required').max(10000, 'text too long'),
  metadata: z.record(z.unknown()).optional(),
  enableGraphExtraction: z.boolean().optional()
});

export class AsyncMemoryController {
  /**
   * POST /api/memory/add
   * Enqueues a memory for async processing. Returns 202 Accepted immediately.
   */
  async addMemory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = addMemorySchema.parse(req.body);

      // Ensure user context is present (should be attached by hybridAuth middleware)
      if (!req.userContext) {
        throw new ApiError({
          code: 'UNAUTHORIZED',
          status: 401,
          message: 'User context not found'
        });
      }

      // Validate userId matches authenticated user
      if (data.userId !== req.userContext.userId) {
        throw new ApiError({
          code: 'FORBIDDEN',
          status: 403,
          message: 'Cannot add memory for different user'
        });
      }

      // Enqueue the job with user context
      const job = await memoryProcessingQueue.add('process-memory', {
        userId: data.userId,
        text: data.text,
        metadata: data.metadata,
        userContext: req.userContext, // CRITICAL: Pass billing context
        enableGraphExtraction: data.enableGraphExtraction
      }, {
        jobId: `${data.userId}-${Date.now()}` // Unique job ID for tracking
      });

      res.status(202).json({
        message: 'Memory queued for processing',
        jobId: job.id,
        userId: data.userId,
        source: req.userContext.source,
        graphExtractionEnabled: req.userContext.source === 'DIRECT' && data.enableGraphExtraction !== false
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ApiError({
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

  /**
   * GET /api/memory/job/:jobId
   * Check the status of a queued job
   */
  async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await memoryProcessingQueue.getJob(jobId);

      if (!job) {
        throw new ApiError({
          code: 'JOB_NOT_FOUND',
          status: 404,
          message: 'Job not found'
        });
      }

      const state = await job.getState();
      const progress = job.progress;
      const returnValue = job.returnvalue;
      const failedReason = job.failedReason;

      res.json({
        jobId: job.id,
        state,
        progress,
        result: returnValue,
        error: failedReason
      });
    } catch (error) {
      next(error);
    }
  }
}
