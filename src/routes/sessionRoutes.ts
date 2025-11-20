import { Router } from 'express';
import { SessionController } from '../controllers/sessionController';

export const sessionRoutes = (controller: SessionController) => {
  const router = Router();
  router.get('/sessions/:sessionId', controller.getSession);
  return router;
};
