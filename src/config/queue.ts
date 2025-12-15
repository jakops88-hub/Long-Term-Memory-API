import { Queue } from 'bullmq';
import { redisForBullMQ } from './redis';
import { UserContext } from '../types/billing';

export interface AddMemoryJobData {
  userId: string;
  text: string;
  metadata?: Record<string, unknown>;
  userContext: UserContext; // CRITICAL: Include billing context in job
  enableGraphExtraction?: boolean; // Can be disabled for RapidAPI users
}

export const memoryProcessingQueue = new Queue<AddMemoryJobData>('memory-processing', {
  connection: redisForBullMQ,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600 // 24 hours
    },
    removeOnFail: {
      count: 500 // Keep last 500 failed jobs for debugging
    }
  }
});

memoryProcessingQueue.on('error', (err) => {
  console.error('Memory queue error:', err);
});
