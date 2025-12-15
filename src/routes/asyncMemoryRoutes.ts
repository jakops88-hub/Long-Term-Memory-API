import { Router } from 'express';
import { AsyncMemoryController } from '../controllers/asyncMemoryController';
import { hybridAuth } from '../middleware/hybridAuth';

const router = Router();
const controller = new AsyncMemoryController();

/**
 * POST /api/memory/add
 * Enqueue memory for async processing
 * Requires authentication (RapidAPI or Direct)
 */
router.post('/add', hybridAuth, controller.addMemory.bind(controller));

/**
 * GET /api/memory/job/:jobId
 * Get job status
 * Requires authentication
 */
router.get('/job/:jobId', hybridAuth, controller.getJobStatus.bind(controller));

export default router;
