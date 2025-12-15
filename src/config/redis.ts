import Redis from 'ioredis';
import { env } from './env';

// Primary Redis connection for general use
export const redis = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false
});

// Separate connection for BullMQ (required by the library)
export const redisForBullMQ = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});
