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

Copyright Jakob Sandstrom. Licensed under the MIT License.
