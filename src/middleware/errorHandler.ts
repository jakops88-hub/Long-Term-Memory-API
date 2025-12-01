import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/errors';
import { env, logger } from '../config';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  console.error(err); // Added for debugging
  const isApiError = err instanceof ApiError;
  const status = isApiError ? err.status : 500;
  const code = isApiError ? err.code : 'INTERNAL_ERROR';
  const message =
    env.isProduction && !isApiError
      ? 'Unexpected error occurred'
      : err.message || 'Unexpected error occurred';

  logger.error('Request error', {
    path: req.path,
    method: req.method,
    status,
    code,
    message
  });

  res.status(status).json({
    error: {
      code,
      message,
      details: isApiError ? err.details || {} : {}
    }
  });
};

