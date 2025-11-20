import { Request, Response, NextFunction } from 'express';
import { MemoryService } from '../services/memoryService';

export class SessionController {
  constructor(private memoryService: MemoryService) {}

  getSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const summary = await this.memoryService.sessionSummary(sessionId);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  };
}
