# Memory-as-a-Service API

Production-grade API that gives agents and applications long-term memory. Built with Node.js, TypeScript, Express, and PostgreSQL (with optional embeddings via OpenAI).

## Features
- Store and retrieve memories per session with importance, recency, and semantic scoring.
- Optional embeddings (OpenAI) with graceful fallback to keyword/recency/importance ranking.
- Clean architecture with Prisma for data access.
- Rate limiting, validation, logging, centralized error handling, and health checks.

## Quickstart
1. Install dependencies
   ```bash
   npm install
   ```
2. Copy env template and configure
   ```bash
   cp .env.example .env
   ```
3. Initialize database
   ```bash
   npx prisma migrate dev --name init
   ```
4. Run in development
   ```bash
   npm run dev
   ```

## Environment
Required/optional variables (see `.env.example`):
- `DATABASE_URL` (required) PostgreSQL connection string.
- `PORT` server port (default 4000).
- `NODE_ENV` `development|test|production`.
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`.
- `CORS_ORIGIN` allowed origins (`*` allowed).
- `OPENAI_API_KEY` enable embeddings when set.
- `ENABLE_EMBEDDINGS` `true|false` toggle embeddings.
- Scoring weights: `WEIGHT_SIMILARITY`, `WEIGHT_RECENCY`, `WEIGHT_IMPORTANCE`.
- `MAX_TEXT_LENGTH` maximum accepted text length.
- Admin/pruning: `ADMIN_API_KEY`, `PRUNE_MAX_AGE_DAYS`, `PRUNE_INACTIVE_DAYS`, `PRUNE_IMPORTANCE_THRESHOLD`.

## API
Base path: `/api`.

### POST /api/memory/store
Stores a memory (creates session if missing).
```json
{
  "sessionId": "session-123",
  "text": "User bought an iPhone 15 yesterday.",
  "metadata": { "source": "chat", "userId": "user-abc" },
  "importanceHint": "high"
}
```

### POST /api/memory/retrieve
Retrieves relevant memories for a session and query.
```json
{
  "sessionId": "session-123",
  "query": "What products has the user bought?",
  "limit": 5
}
```

### POST /api/memory/clear
Soft-deletes a session's memories (or selected ones).
```json
{
  "sessionId": "session-123",
  "memoryIds": ["id-1", "id-2"]
}
```

### POST /api/admin/prune
Prunes stale, low-importance memories. Requires header `x-api-key: <ADMIN_API_KEY>`.
Optional body:
```json
{
  "maxAgeDays": 90,
  "inactiveDays": 30,
  "importanceThreshold": 0.3,
  "take": 500
}
```

### GET /api/sessions/:sessionId
Inspect a session summary (counts, timestamps).

### GET /api/health
Health info for app, DB, and embedding provider.

## Deploying to Railway
- Required env: `DATABASE_URL`, `PORT` (optional, default 4000), `NODE_ENV=production`, `ADMIN_API_KEY`, rate-limit settings, scoring weights, and embedding config (`OPENAI_API_KEY`, `ENABLE_EMBEDDINGS`).
- Steps:
  1. Create a PostgreSQL instance on Railway and copy its `DATABASE_URL`.
  2. Create a new service from this repo (Dockerfile provided) and set env vars.
  3. Apply migrations on deploy: set start/command to `npx prisma migrate deploy && node dist/server.js` (or rely on `docker-entrypoint.sh` in the provided image).
  4. pgvector is optional but recommended; enable the extension on your DB if you want semantic search scoring.

## Testing
Run all tests:
```bash
npm test
```
Includes unit tests for scoring, service tests with mocked embeddings, and integration tests for memory endpoints using Supertest with a mocked repository.
