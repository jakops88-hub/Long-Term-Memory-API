import { Request, Response, NextFunction } from 'express';
import { logger } from '../config';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      sessionId: req.body?.sessionId,
      length: req.body?.text ? String(req.body.text).length : undefined
    });
  });
  next();
};
