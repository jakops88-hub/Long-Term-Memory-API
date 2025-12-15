import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(60),
  CORS_ORIGIN: z.string().default('*'),
  
  // Embedding settings
  ENABLE_EMBEDDINGS: z.string().optional(),
  EMBEDDING_PROVIDER: z.enum(['openai', 'ollama']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_URL: z.string().url().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('nomic-embed-text'),

  // Redis settings (Traditional)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Upstash Redis REST API (recommended for serverless)
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // LLM for Graph Extraction
  LLM_PROVIDER: z.enum(['openai']).default('openai'),
  LLM_MODEL: z.string().default('gpt-4o-mini'),

  // Cost Guard
  COST_PER_1K_TOKENS: z.coerce.number().default(0.0001), // $0.0001 per 1k tokens
  PROFIT_MARGIN: z.coerce.number().default(1.5), // 50% margin

  // New weighting keys; also support legacy SCORING_* for compatibility
  WEIGHT_SIMILARITY: z.coerce.number().optional(),
  WEIGHT_RECENCY: z.coerce.number().optional(),
  WEIGHT_IMPORTANCE: z.coerce.number().optional(),
  SCORING_WEIGHT_SIMILARITY: z.coerce.number().optional(),
  SCORING_WEIGHT_RECENCY: z.coerce.number().optional(),
  SCORING_WEIGHT_IMPORTANCE: z.coerce.number().optional(),
  
  MIN_SIMILARITY_SCORE: z.coerce.number().default(0.5),
  
  MAX_TEXT_LENGTH: z.coerce.number().default(4000),
  ADMIN_API_KEY: z.string().optional(),
  
  // Pruning settings
  PRUNE_MAX_AGE_DAYS: z.coerce.number().default(90),
  PRUNE_INACTIVE_DAYS: z.coerce.number().default(30),
  PRUNE_IMPORTANCE_THRESHOLD: z.coerce.number().default(0.3),

  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Hybrid Authentication
  RAPIDAPI_PROXY_SECRET: z.string().optional()
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
  databaseUrl: raw.SUPABASE_URL,
  nodeEnv: raw.NODE_ENV,
  rateLimitWindowMs: raw.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: raw.RATE_LIMIT_MAX_REQUESTS,
  corsOrigin: raw.CORS_ORIGIN,
  
  // Embeddings
  embeddingsEnabled: raw.ENABLE_EMBEDDINGS?.toLowerCase() === 'true',
  embeddingProvider: raw.EMBEDDING_PROVIDER,
  openAiApiKey: raw.OPENAI_API_KEY,
  ollamaUrl: raw.OLLAMA_URL,
  ollamaModel: raw.OLLAMA_MODEL,

  // Redis (Traditional)
  redisHost: raw.REDIS_HOST,
  redisPort: raw.REDIS_PORT,
  redisPassword: raw.REDIS_PASSWORD,

  // Upstash Redis REST API
  upstashRedisRestUrl: raw.UPSTASH_REDIS_REST_URL,
  upstashRedisRestToken: raw.UPSTASH_REDIS_REST_TOKEN,

  // LLM
  llmProvider: raw.LLM_PROVIDER,
  llmModel: raw.LLM_MODEL,

  // Cost Guard
  costPer1kTokens: raw.COST_PER_1K_TOKENS,
  profitMargin: raw.PROFIT_MARGIN,

  scoringWeights: {
    similarity:
      raw.WEIGHT_SIMILARITY ??
      raw.SCORING_WEIGHT_SIMILARITY ??
      0.5,
    recency:
      raw.WEIGHT_RECENCY ??
      raw.SCORING_WEIGHT_RECENCY ??
      0.2,
    importance:
      raw.WEIGHT_IMPORTANCE ??
      raw.SCORING_WEIGHT_IMPORTANCE ??
      0.3
  },
  minSimilarityScore: raw.MIN_SIMILARITY_SCORE,
  maxTextLength: raw.MAX_TEXT_LENGTH,
  adminApiKey: raw.ADMIN_API_KEY,
  prune: {
    maxAgeDays: raw.PRUNE_MAX_AGE_DAYS,
    inactiveDays: raw.PRUNE_INACTIVE_DAYS,
    importanceThreshold: raw.PRUNE_IMPORTANCE_THRESHOLD
  },
  
  // Stripe
  stripePublishableKey: raw.STRIPE_PUBLISHABLE_KEY,
  stripeSecretKey: raw.STRIPE_SECRET_KEY,
  stripeWebhookSecret: raw.STRIPE_WEBHOOK_SECRET,
  
  // Authentication
  rapidApiProxySecret: raw.RAPIDAPI_PROXY_SECRET,
  
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test'
};
