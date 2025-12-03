# MemVault

> **A Memory Server for AI Agents. Runs on Postgres + pgvector.**
> **Now supporting 100% Local/Offline execution via Ollama.**

[![NPM Version](https://img.shields.io/npm/v/memvault-sdk-jakops88?style=flat-square)](https://www.npmjs.com/package/memvault-sdk-jakops88)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

I got tired of setting up Pinecone/Weaviate and writing the same embedding boilerplate for every small AI agent I built.

I wanted something that:
1. Just runs on **PostgreSQL** (which I already use).
2. Handles the **chunking & embedding** automatically.
3. Lets me **visualize** the retrieval process (because debugging vector similarity in JSON logs is difficult).
4. Can run **offline** without API bills.

So I built MemVault. It is a Node.js wrapper around `pgvector` with a generic **Hybrid Search** engine.

---

## Quick Start: Choose your setup

You can run this entirely on your own machine (Docker), or use the managed API to skip the server maintenance.

| Feature | Self-Hosted (Docker) | Managed API (RapidAPI) |
| :--- | :--- | :--- |
| **Price** | Free (Open Source) | Free Tier available |
| **Embeddings** | **Ollama** (Local) or OpenAI | OpenAI (Managed) |
| **Setup Time** | ~15 mins | 30 seconds |
| **Data Privacy** | 100% on your server | Hosted by us |
| **Maintenance** | You manage updates/uptime | We handle everything |
| **Link** | [Scroll down to Docker](#self-hosting-docker) | [**Get API Key**](https://rapidapi.com/jakops88/api/long-term-memory-api) |

---

## Hybrid Search 2.0 (The Algorithm)

Most RAG pipelines only use Vector Search. MemVault uses a **3-way weighted score** to find the most relevant context:

1.  **Semantic (Vector):** Uses Cosine Similarity via `pgvector` to understand meaning.
2.  **Exact Match (Keyword):** Uses **BM25** (Postgres `tsvector`) to find exact product IDs or error codes that vectors miss.
3.  **Recency (Time):** A decay function prioritizing recent memories.

`FinalScore = (Vector * 0.5) + (Keyword * 0.3) + (Recency * 0.2)`

---

## The Visualizer

The hardest part of RAG is knowing *why* your bot retrieved specific context. MemVault comes with a dashboard to visualize the vector search in real-time.

![MemVault Visualizer Dashboard](https://github.com/user-attachments/assets/e9cf2c67-83d9-43f5-9b94-568553441b69)

*(Live Demo: [memvault-demo.vercel.app](https://memvault-demo-g38n.vercel.app/))*

---

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
