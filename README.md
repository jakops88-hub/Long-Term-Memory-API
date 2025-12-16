# MemVault Long Term Memory API

MemVault is a sophisticated GraphRAG (Graph Retrieval-Augmented Generation) platform designed to provide AI models with persistent, structured memory. By extracting entities and relationships from raw text, MemVault builds a queryable knowledge graph that enhances the reasoning capabilities of LLM-based applications.

## Core Features

MemVault moves beyond simple vector search by implementing a multi-layered approach to information retrieval:

* GraphRAG Architecture: Automatically extracts entities and their semantic relationships to build a persistent knowledge graph.
* Hybrid Search: Merges vector-based semantic search with traditional full-text search to ensure maximum accuracy and relevance.
* Modern Dashboard: A clean, high-performance interface built with Next.js and shadcn/ui for monitoring usage and exploring data.
* Stripe Integration: Seamless subscription management and automated billing through the Stripe Customer Portal.
* Cost Guard: Integrated middleware that monitors API consumption in real-time to prevent unexpected costs.
* Async Pipeline: Offloads heavy computation and graph extraction to background workers using Redis and BullMQ to maintain high API responsiveness.

## Technical Architecture

The system is built for scalability and developer experience:

* Backend: Node.js and TypeScript using Express.
* Database: PostgreSQL with pgvector for efficient high-dimensional vector storage.
* ORM: Prisma for type-safe database interactions.
* Infrastructure: Redis for state management and task queuing.
* AI Services: OpenAI API for generating embeddings and performing entity extraction.

## Installation and Setup

Website (https://memvault-demo-g38n.vercel.app/)

Follow these steps to deploy the MemVault environment:

1. Clone the repository:
   git clone https://github.com/jakops88-hub/long-term-memory-api.git
   cd long-term-memory-api

2. Install dependencies:
   npm install

3. Configure environment variables:
   Create a .env file in the root directory and populate it with your credentials as shown in the provided example file:
   DATABASE_URL="postgresql://user:password@localhost:5432/memvault"
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   OPENAI_API_KEY="sk-..."

4. Initialize the database:
   npx prisma migrate dev

## Billing and Access Control

MemVault implements a sophisticated billing logic that handles both direct Stripe customers and third-party integrations like RapidAPI:

* Webhooks: The system listens for Stripe events to automatically manage user tiers and access levels.
* Usage Tracking: For Pro users, API usage is metered and reported to Stripe to handle overage billing.
* Cost Guard Service: Every request is validated against the user's current credit balance in Redis before execution.

## Dashboard Navigation

The dashboard serves as the central hub for managing your MemVault instance:

* Overview: Monitor current credit consumption and active plan status.
* Playground: Visually interact with and explore the extracted knowledge graph.
* API Management: Generate, rotate, and manage secure API keys for your applications.
* Billing: Direct access to the Stripe portal for plan upgrades and invoice management.

## Installation (NPM SDK)

Whether you self-host or use the Cloud API, the SDK works the same way.

```bash
npm install memvault-sdk-jakops88
```

```typescript
import { MemVault } from 'memvault-sdk-jakops88';

// Point to local instance or RapidAPI
const memory = new MemVault({
  apiKey: "YOUR_KEY", 
  baseUrl: "http://localhost:3000" 
});

// 1. Store a memory (Auto-embedding via Ollama/OpenAI)
await memory.store({
  sessionId: "user-123",
  text: "The user prefers strictly typed languages like TypeScript.",
  importanceHint: "high"
});

// 2. Retrieve relevant context (Hybrid Search)
const result = await memory.retrieve({
  sessionId: "user-123",
  query: "What tech stack should I recommend?",
  limit: 3
});
```

---

## Self-Hosting (Docker)

You can run the entire stack (API + DB + Embeddings) offline.

### Prerequisites
* Docker & Docker Compose
* Ollama (optional, for local embeddings)

### 1. Clone the repository
```bash
git clone https://github.com/jakops88-hub/Long-Term-Memory-API.git
cd Long-Term-Memory-API
```

### 2. Configure Environment
```bash
cp .env.example .env
```

To use local embeddings (free/offline), set the provider to `ollama` in your `.env` file:

```bash
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434/api
OLLAMA_MODEL=nomic-embed-text
```

Ensure you have pulled the model in Ollama: `ollama pull nomic-embed-text`

### 3. Start the stack
```bash
docker-compose up -d
```

The API is now available at `http://localhost:3000`.

---

## Architecture

* **Runtime:** Node.js & TypeScript
* **Database:** PostgreSQL + `pgvector`
* **Search:** Hybrid (Vector + BM25 Keyword Search)
* **ORM:** Prisma
* **Visualization:** React + `react-force-graph-2d`

## Contributing

This is a side project that grew into a tool. Issues and PRs are welcome.
Specifically looking for help with:
* **Metadata Filters:** Adding structured filtering alongside vectors.
* **Security:** Implementing session-level encryption.

## License

MIT

---

## GitHub Action: MemVault Sync

MemVault provides a GitHub Action for teams who want to automatically index repository knowledge (e.g., Markdown docs) into their MemVault GraphRAG vault.

### Usage

Create a workflow file (e.g. `.github/workflows/memvault.yml`):

```yaml
name: MemVault Sync
on:
  push:
    branches: [main]

jobs:
  sync-memvault:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Sync to MemVault
        uses: ./github/actions/memvault-sync
        with:
          memvault_api_key: ${{ secrets.MEMVAULT_API_KEY }}
          vault_id: "your-vault-id" # optional
          file_paths: "docs/**/*.md" # optional, default: '**/*.md'
```

### Security & Privacy
- Only files matching the `file_paths` pattern are read and sent to MemVault.
- The API key is handled as a GitHub Secret and is never printed in logs.
- All API communication is encrypted via HTTPS.
- No files or secrets are stored outside the GitHub Action runtime.

See `.github/actions/memvault-sync/action.yml` for all options.

---
Copyright Jakob Sandstrom. Licensed under the MIT License.
Copyright Jakob Sandstrom. Licensed under the MIT License.
>>>>>>> d4736e894641d4fa61e6e9bff6ca12d27377ddfd
