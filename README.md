# MemVault

> **A Memory Server for AI Agents. Runs on Postgres + pgvector.**

[![NPM Version](https://img.shields.io/npm/v/memvault-sdk-jakops88?style=flat-square)](https://www.npmjs.com/package/memvault-sdk-jakops88)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

I got tired of setting up Pinecone or Weaviate and writing the same embedding boilerplate for every small AI agent I built.

I wanted something that:
1. Just runs on **PostgreSQL** (which I already use).
2. Handles the **chunking & embedding** automatically.
3. Lets me **visualize** the retrieval process (because debugging vector similarity in JSON logs is difficult).

So I built MemVault. It is a Node.js wrapper around `pgvector` with a hybrid search algorithm (Vector Similarity + Recency Decay).

---

## Quick Start: Choose your setup

You can run this entirely on your own machine (Docker), or use the managed API to skip the server maintenance.

| Feature | Self-Hosted (Docker) | Managed API (RapidAPI) |
| :--- | :--- | :--- |
| **Price** | Free (Open Source) | Free Tier available |
| **Setup Time** | ~15 mins | 30 seconds |
| **Data Privacy** | 100% on your server | Hosted by us |
| **Maintenance** | You manage updates/uptime | We handle everything |
| **Link** | [Scroll down to Self-Hosting](#self-hosting-docker) | [**Get API Key**](https://rapidapi.com/jakops88/api/long-term-memory-api) |

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
import { MemVault } from 'memvault-sdk-jakops88';

// If self-hosting, change the baseUrl to your local instance (http://localhost:3000)
// If using Managed API, use the RapidAPI endpoint
const memory = new MemVault({
  apiKey: "YOUR_API_KEY", 
  baseUrl: "[https://long-term-memory-api.p.rapidapi.com](https://long-term-memory-api.p.rapidapi.com)" 
});

// 1. Store a memory (Automatic embedding generation)
await memory.store({
  sessionId: "user-123",
  text: "The user prefers strictly typed languages like TypeScript.",
  importanceHint: "high" // Optional weighting
});

// 2. Retrieve relevant context
const result = await memory.retrieve({
  sessionId: "user-123",
  query: "What tech stack should I recommend?",
  limit: 3
});

console.log(result); 
// Returns relevant chunks based on Semantic Match + Recency
## Self-Hosting (Docker)

If you prefer to own the stack, you can spin it up with Docker Compose. It sets up the API and a Postgres instance with `pgvector` pre-installed.

**Prerequisites:**
* Docker & Docker Compose
* An OpenAI API Key (Local Ollama support is on the roadmap)

**1. Clone the repo**
```bash
git clone [https://github.com/jakops88-hub/Long-Term-Memory-API.git](https://github.com/jakops88-hub/Long-Term-Memory-API.git)
cd Long-Term-Memory-API
**3. Run it**
```bash
docker-compose up -d
```

Your API is now running at `http://localhost:3000`.

---

## Architecture & Tech Stack

* **Runtime:** Node.js & TypeScript
* **Database:** PostgreSQL + `pgvector`
* **ORM:** Prisma
* **Algorithm:** Hybrid Scoring `(CosineSimilarity * 0.8) + (RecencyDecay * 0.2)`

---

## Contributing

This is a side project that grew into a tool. Issues and PRs are welcome.
Specifically looking for help with:
* **Ollama Integration:** To make the stack 100% offline capable.
* **Metadata Filters:** Adding structured filtering alongside vectors.

## License

MIT
