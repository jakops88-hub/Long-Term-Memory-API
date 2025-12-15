import { Request, Response, NextFunction } from 'express';
// Legacy controller - keeping for backward compatibility

export class SessionController {
  constructor(private memoryService: any) {} // Legacy parameter, not used

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
