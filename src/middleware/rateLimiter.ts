import { Request, Response, NextFunction } from 'express';
import { env } from '../config';
import { ApiError } from '../types/errors';

type Counter = { count: number; windowStart: number };
const buckets = new Map<string, Counter>();

export const rateLimiter = (req: Request, _res: Response, next: NextFunction) => {
  const now = Date.now();
  const windowStart = now - env.rateLimitWindowMs;
  const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const entry = buckets.get(key) || { count: 0, windowStart: now };

  if (entry.windowStart < windowStart) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count += 1;
  buckets.set(key, entry);

  if (entry.count > env.rateLimitMaxRequests) {
    next(
      new ApiError({
        code: 'RATE_LIMIT_EXCEEDED',
        status: 429,
        message: 'Rate limit exceeded'
      })
    );
    return;
  }

  next();
};
