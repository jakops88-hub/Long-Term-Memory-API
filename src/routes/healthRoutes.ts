import { Router } from 'express';
import { HealthController } from '../controllers/healthController';

export const healthRoutes = (controller: HealthController) => {
  const router = Router();
  router.get('/health', controller.health);
  return router;
};
