# 🧠 MemVault: Long-Term Memory Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

**Production-grade API to give your AI agents long-term memory without the boilerplate.**

Stop setting up Pinecone, embedding pipelines, and chunking logic for every side project. MemVault abstracts the entire RAG pipeline into a single API endpoint that runs on your own infrastructure (PostgreSQL + pgvector).

---

## ✨ Features

* **Hybrid Search:** Retrieves memories based on a weighted score of **Semantic Similarity**, **Recency**, and **Importance**.
* **Auto-Embedding:** Handles text chunking and embedding generation (OpenAI supported, local models coming soon).
* **Self-Hostable:** Runs on standard PostgreSQL. No vendor lock-in.
* **Visualizer Dashboard:** Includes a frontend tool to debug retrieval and see exactly *why* a specific memory was recalled.
* **Prisma ORM:** Type-safe database access.

---

## 👁️ Visualizer (The "Debugger" for RAG)

Debugging invisible vectors is a nightmare. MemVault includes a visualizer to verify your retrieval pipeline in real-time.

![Visualizer Dashboard](https://github.com/user-attachments/assets/e9cf2c67-83d9-43f5-9b94-568553441b69)

>
> *[Live Demo](https://memvault-demo-g38n.vercel.app/)*

---

## 🚀 Quick Start (Docker)

The easiest way to run MemVault is with Docker Compose. This spins up the API and a Postgres instance with `pgvector` pre-installed.

```bash
# 1. Clone the repo
git clone [https://github.com/jakops88-hub/Long-Term-Memory-API.git](https://github.com/jakops88-hub/Long-Term-Memory-API.git)
cd Long-Term-Memory-API

# 2. Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY (required for embeddings for now)

# 3. Start the stack
docker-compose up -d

Your API is now running at http://localhost:3000.
🛠️ Manual Installation
If you prefer to run it without Docker or deploy to Railway/Vercel.
 * Install dependencies
   npm install

 * Configure Environment
   cp .env.example .env

 * Initialize Database
   npx prisma migrate dev --name init

 * Run Development Server
   npm run dev

🔌 API Usage
Base URL: http://localhost:4000/api
1. Store a Memory
The API handles chunking and vectorization automatically.
curl -X POST http://localhost:4000/api/memory/store \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "agent-007",
    "text": "The user prefers strictly typed languages like TypeScript.",
    "importanceHint": "high",
    "metadata": { "source": "user_chat" }
  }'

2. Retrieve Context
Gets the most relevant memories based on the hybrid scoring algorithm.
curl -X POST http://localhost:4000/api/memory/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "agent-007",
    "query": "What language should I use for the backend?",
    "limit": 3
  }'

3. Clear History
Soft-deletes memories for a session.
curl -X POST http://localhost:4000/api/memory/clear \
  -H "Content-Type: application/json" \
  -d '{ "sessionId": "agent-007" }'

⚙️ Configuration (.env)
| Variable | Description | Default |
|---|---|---|
| DATABASE_URL | Required. PostgreSQL connection string | - |
| OPENAI_API_KEY | Required if ENABLE_EMBEDDINGS=true | - |
| ENABLE_EMBEDDINGS | Toggle vector generation | true |
| WEIGHT_SIMILARITY | 0.0 to 1.0 influence of vector match | 0.8 |
| WEIGHT_RECENCY | 0.0 to 1.0 influence of how new data is | 0.2 |
| ADMIN_API_KEY | Key for admin endpoints (pruning) | - |
🚅 Deploying to Railway
 * Fork this repo.
 * Create a project on Railway with PostgreSQL.
 * Enable the vector extension in your database (Railway usually supports this out of the box or via SQL command CREATE EXTENSION vector;).
 * Deploy this repo and add your DATABASE_URL and OPENAI_API_KEY.
 * Build Command: npm install && npx prisma generate
 * Start Command: npx prisma migrate deploy && node dist/server.js
🧪 Testing
# Run unit & integration tests
npm test

🤝 Contributing
PRs are welcome! Specifically looking for:
 * Support for Ollama embeddings (local).
 * Support for other Vector DBs (Chroma, etc).
