# Phase 2: Async Ingestion Pipeline

## Overview
Phase 2 implements a production-ready async memory ingestion pipeline using BullMQ. The system decouples API requests from processing to handle scale, implements Cost Guard for profitability, and extracts knowledge graphs using LLM.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  API Server  │─────▶│ Redis Queue │
│             │◀─────│  (202 Accept)│      │   (BullMQ)  │
└─────────────┘      └──────────────┘      └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │   Worker    │
                                            │  Processor  │
                                            └──────┬──────┘
                                                   │
                     ┌─────────────────────────────┼─────────────────────────────┐
                     │                             │                             │
                     ▼                             ▼                             ▼
              ┌────────────┐              ┌─────────────┐              ┌───────────────┐
              │ Cost Guard │              │ LLM Extract │              │   PostgreSQL  │
              │  (Redis)   │              │   Entities  │              │  (GraphRAG)   │
              └────────────┘              └─────────────┘              └───────────────┘
```

## Key Components

### 1. API Endpoint (`POST /api/memory/add`)
- **Async-first**: Returns `202 Accepted` immediately
- **No blocking**: Just enqueues job to Redis
- **Job tracking**: Returns job ID for status polling

### 2. BullMQ Queue
- **Reliable**: Persistent jobs in Redis
- **Scalable**: Can add more workers
- **Resilient**: Auto-retry with exponential backoff

### 3. Worker Processor (`src/worker.ts`)
The worker executes 5 critical steps:

#### Step A: Cost Guard (Pre-check)
```typescript
const hasBalance = await CostGuardService.hasBalance(userId, 1);
if (!hasBalance) throw new Error('Insufficient balance');
```

#### Step B: Generate Embedding
```typescript
const embedding = await embeddingProvider.generateEmbedding(text);
```

#### Step C: Graph Extraction (LLM)
```typescript
const { entities, relationships } = await graphExtractor.extractGraph(text);
// Returns:
// entities: [{ name: "John Doe", type: "PERSON" }, ...]
// relationships: [{ from: "John Doe", to: "iPhone 15", predicate: "BOUGHT" }]
```

#### Step D: Transactional Upsert
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Save Memory
  const memory = await tx.memory.create({ ... });
  
  // 2. Upsert Entities (deduplicate by name)
  for (const entity of entities) {
    await tx.entity.upsert({ ... });
  }
  
  // 3. Create Relationships
  for (const rel of relationships) {
    await tx.relationship.create({ ... });
  }
});
```

#### Step E: Deduct Actual Cost
```typescript
const cost = CostGuardService.calculateCost(totalTokens, costPer1k, profitMargin);
await CostGuardService.deductCost(userId, cost);
```

## Setup

### 1. Install Redis
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# Windows (via Docker)
docker run -d -p 6379:6379 redis:alpine
```

### 2. Configure Environment
Add to `.env`:
```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_password

# LLM for Graph Extraction
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...

# Cost Guard
COST_PER_1K_TOKENS=0.0001
PROFIT_MARGIN=1.5
```

### 3. Start Services

**Terminal 1: API Server**
```bash
npm run dev
```

**Terminal 2: Worker**
```bash
npm run worker
```

## Testing

### Quick Test
```bash
npx ts-node scripts/test_async_pipeline.ts
```

### Manual API Test
```bash
# 1. Set user balance
curl -X POST http://localhost:4000/api/billing/set-balance \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-123","amount":10000}'

# 2. Submit memory
curl -X POST http://localhost:4000/api/memory/add \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"test-123",
    "text":"John bought an iPhone 15 from Apple Store"
  }'

# Response:
# {
#   "message": "Memory queued for processing",
#   "jobId": "test-123-1234567890"
# }

# 3. Check job status
curl http://localhost:4000/api/memory/job/test-123-1234567890

# 4. Check balance
curl http://localhost:4000/api/billing/balance/test-123
```

## API Endpoints

### Memory Processing
- `POST /api/memory/add` - Submit memory (202 Accepted)
- `GET /api/memory/job/:jobId` - Get job status

### Billing
- `GET /api/billing/balance/:userId` - Get balance
- `POST /api/billing/add-credits` - Add credits
- `POST /api/billing/set-balance` - Set balance (admin)

## Cost Guard Logic

The system ensures **100% profitability** by:

1. **Pre-check**: Verifies balance BEFORE processing
2. **Actual cost**: Calculates real token usage
3. **Profit margin**: Adds configurable margin (default 50%)
4. **Atomic deduction**: Uses Redis Lua script for race-free balance updates

Example:
```
Input: 500 tokens used
Base Cost: 500 / 1000 * $0.0001 = $0.00005
With 50% margin: $0.00005 * 1.5 = $0.000075
In credits (cents): 1 credit
```

## Graph Extraction

The LLM extracts structured knowledge:

**Input Text:**
> "John Doe bought an iPhone 15 from Apple Store. He works at TechCorp."

**Extracted Graph:**
```json
{
  "entities": [
    {"name": "John Doe", "type": "PERSON"},
    {"name": "iPhone 15", "type": "PRODUCT"},
    {"name": "Apple Store", "type": "ORGANIZATION"},
    {"name": "TechCorp", "type": "ORGANIZATION"}
  ],
  "relationships": [
    {"from": "John Doe", "to": "iPhone 15", "predicate": "BOUGHT"},
    {"from": "John Doe", "to": "TechCorp", "predicate": "WORKS_AT"}
  ]
}
```

## Monitoring

The worker logs progress:
```
Processing memory for user test-123...
Generated embedding (768 dimensions)
Extracted 4 entities and 2 relationships
Token usage: 234
Deducted 1 credits from user test-123
✓ Job test-123-1234567890 completed successfully
```

## Production Deployment

### Railway/Render
1. Add Redis addon
2. Set env vars
3. Deploy two services:
   - `npm start` (API)
   - `npm start:worker` (Worker)

### Docker Compose
```yaml
services:
  api:
    build: .
    command: npm start
    environment:
      - REDIS_HOST=redis
    ports:
      - "4000:4000"
  
  worker:
    build: .
    command: npm start:worker
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## Next Steps (Phase 3)

- Implement "Sleep Cycles" for memory consolidation
- Add recursive graph traversal queries
- Implement smart deduplication
- Add webhooks for job completion
- Implement rate limiting per tier
