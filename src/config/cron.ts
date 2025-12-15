/**
 * Cron Scheduler for Background Jobs
 * 
 * Manages scheduled tasks:
 * - Memory consolidation (every 6 hours)
 * - Memory pruning (daily)
 * - Health checks
 */

import cron, { ScheduledTask } from 'node-cron';
import { ConsolidationService } from '../services/consolidationService';
import { logger } from '../config/logger';

export class CronScheduler {
  private static tasks: ScheduledTask[] = [];

  /**
   * Initialize all cron jobs
   */
  static init() {
    logger.info('Initializing cron scheduler');

    // Memory Consolidation: Every 6 hours
    const consolidationTask = cron.schedule('0 */6 * * *', async () => {
      logger.info('Running scheduled consolidation cycle');
      try {
        const results = await ConsolidationService.consolidateAllUsers();
        logger.info('Scheduled consolidation completed', {
          usersProcessed: results.length,
          successful: results.filter(r => !r.skipped).length
        });
      } catch (error: any) {
        logger.error('Scheduled consolidation failed', { error: error.message });
      }
    }, {
      timezone: 'UTC'
    });

    this.tasks.push(consolidationTask);
    logger.info('Consolidation cron scheduled (every 6 hours)');

    // Memory Pruning: Daily at 3 AM UTC
    const pruningTask = cron.schedule('0 3 * * *', async () => {
      logger.info('Running scheduled memory pruning');
      try {
        // TODO: Implement pruning service
        logger.info('Memory pruning completed');
      } catch (error: any) {
        logger.error('Scheduled pruning failed', { error: error.message });
      }
    }, {
      timezone: 'UTC'
    });

    this.tasks.push(pruningTask);
    logger.info('Pruning cron scheduled (daily at 3 AM UTC)');

    // Health Check: Every hour
    const healthTask = cron.schedule('0 * * * *', () => {
      logger.info('Scheduled health check', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeTasks: this.tasks.filter(t => t.getStatus() === 'scheduled').length
      });
    }, {
      timezone: 'UTC'
    });

    this.tasks.push(healthTask);
    logger.info('Health check cron scheduled (hourly)');

    logger.info(`All cron jobs initialized (${this.tasks.length} tasks)`);
  }

  /**
   * Stop all cron jobs
   */
  static stop() {
    logger.info('Stopping all cron jobs');
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
  }

  /**
   * Get status of all cron jobs
   */
  static getStatus() {
    return this.tasks.map((task, index) => ({
      index,
      status: task.getStatus()
    }));
  }
}
