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
- Scoring weights: `SCORING_WEIGHT_SIMILARITY`, `SCORING_WEIGHT_RECENCY`, `SCORING_WEIGHT_IMPORTANCE`.
- `MAX_TEXT_LENGTH` maximum accepted text length.

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
Soft-deletes a session’s memories (or selected ones).
```json
{
  "sessionId": "session-123",
  "memoryIds": ["id-1", "id-2"]
}
```

### GET /api/sessions/:sessionId
Inspect a session summary (counts, timestamps).

### GET /api/health
Health info for app, DB, and embedding provider.

## Testing
Run all tests:
```bash
npm test
```
Includes unit tests for scoring, service tests with mocked embeddings, and integration tests for memory endpoints using Supertest with a mocked repository.
