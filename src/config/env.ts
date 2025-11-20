import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(60),
  CORS_ORIGIN: z.string().default('*'),
  OPENAI_API_KEY: z.string().optional(),
  ENABLE_EMBEDDINGS: z.string().optional(),
  SCORING_WEIGHT_SIMILARITY: z.coerce.number().default(0.5),
  SCORING_WEIGHT_RECENCY: z.coerce.number().default(0.2),
  SCORING_WEIGHT_IMPORTANCE: z.coerce.number().default(0.3),
  MAX_TEXT_LENGTH: z.coerce.number().default(4000)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.format();
  // Fail fast on missing/invalid env
  throw new Error(`Invalid environment configuration: ${JSON.stringify(formatted, null, 2)}`);
}

const raw = parsed.data;

export const env = {
  port: raw.PORT,
  databaseUrl: raw.DATABASE_URL,
  nodeEnv: raw.NODE_ENV,
  rateLimitWindowMs: raw.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: raw.RATE_LIMIT_MAX_REQUESTS,
  corsOrigin: raw.CORS_ORIGIN,
  openAiApiKey: raw.OPENAI_API_KEY,
  embeddingsEnabled:
    raw.ENABLE_EMBEDDINGS?.toLowerCase() === 'true' && Boolean(raw.OPENAI_API_KEY),
  scoringWeights: {
    similarity: raw.SCORING_WEIGHT_SIMILARITY,
    recency: raw.SCORING_WEIGHT_RECENCY,
    importance: raw.SCORING_WEIGHT_IMPORTANCE
  },
  maxTextLength: raw.MAX_TEXT_LENGTH,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test'
};
