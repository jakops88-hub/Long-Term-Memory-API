import { Redis } from '@upstash/redis';
import { env } from './env';

// Check if using Upstash REST API or traditional Redis
const useUpstash = !!(env.upstashRedisRestUrl && env.upstashRedisRestToken);

if (!useUpstash && !env.redisHost) {
  throw new Error('Either UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN or REDIS_HOST must be configured');
}

// Primary Redis connection for general use
export const redis = useUpstash
  ? new Redis({
      url: env.upstashRedisRestUrl!,
      token: env.upstashRedisRestToken!,
    })
  : (() => {
      // Fallback to ioredis for traditional Redis (won't be used with Upstash)
      const IORedis = require('ioredis');
      return new IORedis({
        host: env.redisHost,
        port: env.redisPort,
        password: env.redisPassword,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      });
    })();

// For BullMQ, we need ioredis connection (not REST API)
// If using Upstash, BullMQ needs the traditional connection string
export const redisForBullMQ = useUpstash
  ? (() => {
      const IORedis = require('ioredis');
      // Upstash also provides traditional Redis connection
      // Format: redis://default:PASSWORD@ENDPOINT:PORT
      if (!env.redisHost) {
        console.warn('Warning: BullMQ requires ioredis connection. Add REDIS_HOST, REDIS_PORT, REDIS_PASSWORD for Upstash traditional connection.');
      }
      return new IORedis({
        host: env.redisHost || 'localhost',
        port: env.redisPort || 6379,
        password: env.redisPassword,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      });
    })()
  : (() => {
      const IORedis = require('ioredis');
      return new IORedis({
        host: env.redisHost,
        port: env.redisPort,
        password: env.redisPassword,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      });
    })();

if (useUpstash) {
  console.log('✅ Using Upstash Redis REST API');
} else {
  console.log('✅ Using traditional Redis connection');
  
  // Only attach event listeners for ioredis
  if (redis && typeof redis.on === 'function') {
    redis.on('error', (err: any) => {
      console.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }
}
