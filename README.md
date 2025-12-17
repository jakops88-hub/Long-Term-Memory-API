# MemVault: The Intelligent Memory Layer for AI Agents

![Build Status](https://img.shields.io/github/actions/workflow/status/jakops88-hub/long-term-memory-api/main.yml?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)
![NPM Version](https://img.shields.io/npm/v/memvault-sdk-jakops88?style=flat-square&color=cb3837)
![Marketplace](https://img.shields.io/badge/GitHub_Marketplace-Available-purple?style=flat-square)

> **Give your LLMs long-term memory, semantic understanding, and evolving context—with one line of code.**

MemVault is a production-grade **GraphRAG (Graph Retrieval-Augmented Generation)** platform. Unlike simple vector databases that only find "similar words", MemVault builds a dynamic knowledge graph of entities and relationships, allowing your AI to understand *context*, not just keywords.

[**Start 7-Day Free Trial**](https://memvault-demo-g38n.vercel.app/) | [**Read Documentation**](https://memvault-demo-g38n.vercel.app/docs) | [**NPM SDK**](https://www.npmjs.com/package/@memvault/client)

---

## Why MemVault?

Building persistent memory is hard. Managing vector databases, embedding pipelines, graph databases, and context windows is even harder. MemVault solves this with a managed API that acts as the hippocampus for your AI agents.

### The "Sleep Cycle" Engine (Unique Feature)
Just like the biological brain, MemVault consolidates information asynchronously.

* **Ingest Now, Process Later:** We accept data instantly, but deep processing happens in the background.
* **Auto-Consolidation:** Every 6 hours, our **Sleep Cycle Engine** wakes up to merge duplicate entities, prune noise, and strengthen semantic relationships in the graph.
* **Result:** Your AI gets smarter over time without you writing a single line of maintenance code.

### Production-Grade Features
* **Hybrid Search:** Combines `pgvector` semantic search with keyword extraction for maximum retrieval accuracy.
* **Cost Guard:** Built-in financial firewall. We monitor token usage in real-time to prevent runaway API costs from infinite loops or spikes.
* **GraphRAG:** Automatically extracts entities (People, Places, Concepts) and maps how they relate to each other.

---

## Quickstart

### 1. Install the SDK
Stop messing with raw HTTP requests. Our TypeScript SDK gives you full type safety.

```bash
npm install memvault-sdk-jakops88
```

### 2. Initialize & Use

```typescript
import { MemVault } from 'memvault-sdk-jakops88';

// Initialize with your 'sk_...' key from the dashboard
const memory = new MemVault({
  apiKey: process.env.MEMVAULT_API_KEY
});

// 1. Store a memory (Text -> Vector + Graph Node)
await memory.add({
  content: "The user, Jakob, is a Senior Developer who prefers TypeScript over Python.",
  tags: ["user-profile", "preferences"]
});

// 2. Ask questions (Retrieves context via GraphRAG)
const context = await memory.search("What is Jakob's preferred language?", {
  limit: 1,
  strategy: 'hybrid' // Uses both Vector and Graph traversal
});

console.log(context);
// Output: "Jakob prefers TypeScript (Confidence: 98%)"
```

---

## GitHub Actions Integration

Keep your AI updated with your codebase automatically. Use our official Action to sync documentation or code files directly to your MemVault knowledge graph on every push.

```yaml
# .github/workflows/memvault-sync.yml
name: Sync Docs to Brain
on:
  push:
    paths: ['docs/**']

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: MemVault Sync
        uses: jakops88-hub/long-term-memory-api/.github/actions/memvault-sync@v1
        with:
          memvault_api_key: ${{ secrets.MEMVAULT_API_KEY }}
          file_paths: "docs/**/*.md"
```

---

## Architecture & Security

MemVault is built for scale and security, hosted on high-performance infrastructure.

* **API Layer:** Node.js/Express with strict rate limiting and validation (Zod).
* **Async Workers:** Heavy lifting (Graph extraction, Sleep Cycles) is offloaded to Redis/BullMQ queues to ensure sub-millisecond API response times.
* **Storage:** PostgreSQL with `pgvector` for high-dimensional vector storage.
* **Security:** All keys are encrypted. Usage is sandboxed per user via **HybridAuth**.

---

## Pricing

We offer a straightforward pricing model designed for developers.

| Plan | Price | Features |
|------|-------|----------|
| **Trial** | **Free (7 Days)** | Full access to Hobby tier to test the API. |
| **Hobby** | **$29/mo** | 100k tokens, GraphRAG, Dashboard access. Hard limits (no overage). |
| **Pro** | **$99/mo** | 1M tokens, **Sleep Cycles (Consolidation)**, Priority Support. |

[**View Full Pricing & Upgrade**](https://memvault-demo-g38n.vercel.app/pricing)

---

## Self-Hosting (Open Core)

MemVault is Open Core. You can run the stack locally for development or compliant internal usage. Note that *Sleep Cycles* and *Cost Guard* are optimized for the managed cloud environment.

<details>
<summary><strong>Click to view Docker instructions</strong></summary>

### Prerequisites
* Docker & Docker Compose
* OpenAI API Key (or local Ollama instance)

### Setup
1. Clone the repo:
   ```bash
   git clone [https://github.com/jakops88-hub/long-term-memory-api.git](https://github.com/jakops88-hub/long-term-memory-api.git)
   ```
2. Configure `.env`:
   ```bash
   cp .env.example .env
   # Add your DATABASE_URL and OPENAI_API_KEY
   ```
3. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```
   The API is now available at `http://localhost:3000`.

</details>

---


## License

MIT © [Jakob Sandström](https://github.com/jakops88-hub)
