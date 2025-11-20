import { AnyZodObject, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/errors';

export const validate =
  (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          new ApiError({
            code: 'VALIDATION_ERROR',
            status: 400,
            message: 'Invalid request',
            details: { issues: err.issues }
          })
        );
        return;
      }
      next(err);
    }
  };
