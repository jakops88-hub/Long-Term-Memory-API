import { Worker, Job } from 'bullmq';
import { redisForBullMQ } from './config/redis';
import { AddMemoryJobData } from './config/queue';
import { CostGuard } from './services/hybridCostGuard';
import { EmbeddingProvider } from './services/embeddings/EmbeddingProvider';
import { OllamaProvider } from './services/embeddings/OllamaProvider';
import { OpenAIEmbeddingProvider } from './services/embeddings/OpenAIEmbeddingProvider';
import { GraphExtractionService } from './services/graphExtractionService';
import { prisma } from './config/prisma';
import { env } from './config';

class MemoryWorker {
  private worker: Worker;
  private embeddingProvider: EmbeddingProvider;
  private graphExtractor: GraphExtractionService;

  constructor() {
    // Initialize embedding provider
    if (env.embeddingProvider === 'ollama') {
      this.embeddingProvider = new OllamaProvider();
    } else {
      this.embeddingProvider = new OpenAIEmbeddingProvider(env.openAiApiKey!);
    }

    // Initialize graph extractor
    this.graphExtractor = new GraphExtractionService();

    // Create worker
    this.worker = new Worker<AddMemoryJobData>(
      'memory-processing',
      this.processJob.bind(this),
      {
        connection: redisForBullMQ,
        concurrency: 5, // Process up to 5 jobs concurrently
        limiter: {
          max: 10, // Max 10 jobs
          duration: 1000 // per second
        }
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`✓ Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`✗ Job ${job?.id} failed:`, err.message);
    });

    console.log('Memory processing worker started');
  }

  private async processJob(job: Job<AddMemoryJobData>): Promise<{ memoryId: string; cost: number }> {
    const { userId, text, metadata, userContext, enableGraphExtraction = true } = job.data;

    console.log(`Processing memory for user ${userId} (${userContext.source}/${userContext.tier})...`);

    // ============================================================================
    // STEP A: Hybrid Cost Guard - Pre-flight Check
    // ============================================================================
    await job.updateProgress(10);
    
    // Estimate cost based on text length and features
    const estimatedTokens = Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 chars
    const willExtractGraph = enableGraphExtraction && userContext.source === 'DIRECT';
    
    const estimatedCost = CostGuard.calculateEstimatedCost(
      estimatedTokens,
      true, // Always generate embedding
      willExtractGraph // Only for Direct users
    );

    console.log(`Estimated cost: ${estimatedCost} cents ($${(estimatedCost / 100).toFixed(2)})`);

    // Check access
    const accessCheck = await CostGuard.checkAccess(userId, userContext, estimatedCost);
    
    if (!accessCheck.allowed) {
      throw new Error('Access denied: insufficient balance or permissions');
    }

    console.log(`Access granted. Background jobs: ${accessCheck.allowBackgroundJobs ? 'ENABLED' : 'DISABLED'}`);

    // ============================================================================
    // STEP B: Generate Embedding (Always)
    // ============================================================================
    await job.updateProgress(25);
    
    const embedding = await this.embeddingProvider.generateEmbedding(text);
    console.log(`Generated embedding (${embedding.length} dimensions)`);

    // ============================================================================
    // STEP C: Graph Extraction (Direct users only if enabled)
    // ============================================================================
    await job.updateProgress(40);
    
    let entities: any[] = [];
    let relationships: any[] = [];
    let usage: any = null;

    if (willExtractGraph && accessCheck.allowBackgroundJobs) {
      console.log('Running graph extraction (Direct user with background jobs enabled)...');
      const extractionResult = await this.graphExtractor.extractGraph(text);
      entities = (extractionResult as any).entities || [];
      relationships = (extractionResult as any).relationships || [];
      usage = (extractionResult as any).usage;
      
      console.log(`Extracted ${entities.length} entities and ${relationships.length} relationships`);
      console.log(`Token usage: ${usage?.total_tokens || 'unknown'}`);
    } else {
      console.log('Skipping graph extraction (RapidAPI user or feature disabled)');
    }

    // ============================================================================
    // STEP D: Transactional Upsert
    // ============================================================================
    await job.updateProgress(60);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Memory using raw SQL (to support vector type)
      const memoryResult = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "Memory" (
          id, "userId", text, "compressedText", metadata, embedding,
          "importanceScore", confidence, "createdAt", "lastAccessedAt"
        )
        VALUES (
          gen_random_uuid(), ${userId}, ${text}, ${text.slice(0, 500)}, ${JSON.stringify(metadata || {})}::jsonb,
          ${`[${embedding.join(',')}]`}::vector,
          0.5, 1.0, NOW(), NOW()
        )
        RETURNING id
      `;
      
      const memoryId = memoryResult[0].id;

      // 2. Upsert Entities (deduplicate by userId + name + type)
      const entityMap = new Map<string, string>(); // name -> entityId

      for (const entityData of entities) {
        // Generate embedding for entity (name + description combined)
        const entityText = `${entityData.name} (${entityData.type}): ${entityData.description || ''}`;
        const entityEmbedding = await this.embeddingProvider.generateEmbedding(entityText);
        
        // Use raw SQL to handle vector type
        const entityResult = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO "Entity" (
            id, "userId", name, type, description, embedding, importance, confidence,
            "createdAt", "updatedAt", "lastAccessedAt"
          )
          VALUES (
            gen_random_uuid(), ${userId}, ${entityData.name}, ${entityData.type},
            ${entityData.description || null}, ${`[${entityEmbedding.join(',')}]`}::vector,
            0.5, 1.0, NOW(), NOW(), NOW()
          )
          ON CONFLICT ("userId", name, type)
          DO UPDATE SET
            description = EXCLUDED.description,
            embedding = EXCLUDED.embedding,
            "lastAccessedAt" = NOW(),
            "updatedAt" = NOW()
          RETURNING id
        `;

        entityMap.set(entityData.name, entityResult[0].id);
      }

      // 3. Create Relationships
      for (const relData of relationships) {
        const fromEntityId = entityMap.get(relData.from);
        const toEntityId = entityMap.get(relData.to);

        if (!fromEntityId || !toEntityId) {
          console.warn(`Skipping relationship ${relData.from} -> ${relData.to}: entity not found`);
          continue;
        }

        try {
          await tx.relationship.upsert({
            where: {
              userId_fromEntityId_toEntityId_predicate: {
                userId,
                fromEntityId,
                toEntityId,
                predicate: relData.predicate
              }
            },
            create: {
              userId,
              fromEntityId,
              toEntityId,
              predicate: relData.predicate,
              confidence: 1.0,
              weight: 1.0
            },
            update: {
              confidence: 1.0,
              updatedAt: new Date()
            }
          });
        } catch (err) {
          console.warn(`Failed to create relationship:`, err);
        }
      }

      return { memoryId };
    });

    await job.updateProgress(80);

    // ============================================================================
    // STEP E: Hybrid Cost Deduction
    // ============================================================================
    const totalTokens = (usage?.total_tokens || estimatedTokens) + 100; // +100 for embedding
    const actualCost = CostGuard.calculateEstimatedCost(
      totalTokens,
      true,
      willExtractGraph
    );

    try {
      await CostGuard.deduct(userId, userContext, actualCost);
      console.log(`Deducted ${actualCost} cents from user ${userId} (${userContext.source})`);
    } catch (err) {
      console.error('Failed to deduct cost:', err);
      // Don't throw - memory already saved. Log for manual reconciliation.
    }

    await job.updateProgress(100);

    return {
      memoryId: result.memoryId,
      cost: actualCost
    };
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}

// Start the worker
const worker = new MemoryWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

export default worker;
