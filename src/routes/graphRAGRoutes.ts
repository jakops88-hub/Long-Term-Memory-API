import { Router } from 'express';
import { GraphRAGController } from '../controllers/graphRAGController';
import { GraphRAGService } from '../services/graphRAGService';
import { getEmbeddingProvider } from '../services/embeddings';
import { hybridAuth, blockRapidApi } from '../middleware/hybridAuth';

const router = Router();

// Initialize GraphRAG service with embedding provider
const embeddingProvider = getEmbeddingProvider();
const graphRAGService = new GraphRAGService(embeddingProvider);
const graphRAGController = new GraphRAGController(graphRAGService);

/**
 * POST /api/graphrag/retrieve
 * Retrieve memories and knowledge using GraphRAG multi-hop reasoning
 * 
 * NOTE: RapidAPI users are BLOCKED from this endpoint (expensive recursive queries)
 * 
 * Body:
 * - userId: string (required)
 * - query: string (required)
 * - maxMemories: number (optional, default 10, max 20)
 * - maxEntities: number (optional, default 10, max 20)
 * - graphDepth: number (optional, default 2, max 5)
 * - minSimilarity: number (optional, default 0.7)
 * 
 * Response: 200 OK with memories, entities, graph nodes, and synthesized context
 */
router.post('/retrieve', hybridAuth, blockRapidApi, (req, res, next) => 
  graphRAGController.retrieve(req, res, next)
);

export default router;
