import { Request, Response, NextFunction } from 'express';
import { MemoryService } from '../services/memoryService';

export class MemoryController {
  constructor(private memoryService: MemoryService) {}

  store = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.memoryService.storeMemory(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  retrieve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.memoryService.retrieveMemories(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  clear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.memoryService.clearMemories(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
