import { Prisma } from '@prisma/client';
import {
  ClearMemoryRequest,
  RetrieveMemoryRequest,
  RetrieveMemoryResponse,
  StoreMemoryRequest,
  StoreMemoryResponse
} from '../types/memory';
import { compressText, computeImportanceScore, normalizeText, truncateIfNeeded } from '../utils/text';
import { IMemoryRepository, MemoryWithSimilarity } from '../repositories/memoryRepository';
import { ISessionRepository } from '../repositories/sessionRepository';
import { ApiError } from '../types/errors';
import { EmbeddingProvider } from './embeddings/EmbeddingProvider';
import { env } from '../config';

export class MemoryService {
  constructor(
    private memoryRepository: IMemoryRepository,
    private sessionRepository: ISessionRepository,
    private embeddingProvider?: EmbeddingProvider
  ) {}

  async storeMemory(input: StoreMemoryRequest): Promise<StoreMemoryResponse> {
    if (!this.embeddingProvider?.isEnabled()) {
      throw new ApiError({
        code: 'EMBEDDING_PROVIDER_DISABLED',
        status: 500,
        message: 'The embedding provider is not enabled, which is required for storing memories.'
      });
    }

    const normalizedText = normalizeText(truncateIfNeeded(input.text));

    // Ensure session exists before we do any expensive work
    await this.sessionRepository.upsert(input.sessionId);

    const embedding = await this.embeddingProvider.generateEmbedding(normalizedText);

    // Smart Storage: Check for duplicates before creating a new memory
    const duplicate = await this.memoryRepository.findDuplicate(input.sessionId, embedding);

    if (duplicate) {
      // If a similar memory exists, just update its last access time and return its ID.
      // This avoids creating a new memory and saves space.
      await this.memoryRepository.updateLastAccessed([duplicate.id], new Date());
      const memory = await this.memoryRepository.findById(duplicate.id); // Re-fetch to get all details
      return {
        id: duplicate.id,
        sessionId: input.sessionId,
        importanceScore: memory?.importanceScore ?? 0,
        createdAt: memory?.createdAt.toISOString() ?? new Date().toISOString()
      };
    }

    // No duplicate found, so proceed with creating a new memory
    const importanceScore = computeImportanceScore(normalizedText, input.importanceHint);
    const compressed = compressText(normalizedText);

    const created = await this.memoryRepository.create({
      sessionId: input.sessionId,
      text: normalizedText,
      compressedText: compressed,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      importanceScore,
      embedding
    });

    return {
      id: created.id,
      sessionId: created.sessionId,
      importanceScore: created.importanceScore,
      createdAt: created.createdAt.toISOString()
    };
  }

  async retrieveMemories(input: RetrieveMemoryRequest): Promise<RetrieveMemoryResponse> {
    if (!this.embeddingProvider?.isEnabled()) {
      throw new ApiError({
        code: 'EMBEDDING_PROVIDER_DISABLED',
        status: 500,
        message: 'The embedding provider is not enabled, which is required for retrieving memories.'
      });
    }

    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new ApiError({
        code: 'SESSION_NOT_FOUND',
        status: 404,
        message: 'Session not found'
      });
    }

    const queryEmbedding = await this.embeddingProvider.generateEmbedding(normalizeText(input.query));

    // The repository now handles the complex logic of hybrid search (similarity + importance)
    const candidates = await this.memoryRepository.findSimilarMemories(
      input.sessionId,
      queryEmbedding,
      200, // Fetch more candidates than needed to allow for token budgeting
      input.minScore ?? 0.5
    );

    // Token Budgeting: Ensure the total token count of memories does not exceed the budget.
    const maxTokens = input.maxTokens ?? 1000;
    let tokenUsage = 0;
    const budgetedResults: MemoryWithSimilarity[] = [];

    for (const candidate of candidates) {
      // Estimate token count (a simple approximation)
      const estimatedTokens = Math.ceil(candidate.text.length / 4);
      if (tokenUsage + estimatedTokens > maxTokens) {
        // Stop if adding the next memory would exceed the budget
        break;
      }
      tokenUsage += estimatedTokens;
      budgetedResults.push(candidate);
    }
    
    // Limit to the user's specified limit after budgeting
    const finalResults = budgetedResults.slice(0, input.limit ?? 10);

    const accessTime = new Date();
    if (finalResults.length > 0) {
      await this.memoryRepository.updateLastAccessed(
        finalResults.map((r) => r.id),
        accessTime
      );
    }

    return {
      sessionId: input.sessionId,
      query: input.query,
      tokenUsage,
      results: finalResults.map((item) => ({
        id: item.id,
        text: item.text,
        compressedText: item.compressedText,
        importanceScore: item.importanceScore,
        similarity: item.similarity,
        createdAt: item.createdAt.toISOString(),
        lastAccessedAt: accessTime.toISOString(),
        metadata: (item.metadata as Record<string, unknown> | null) || undefined
      }))
    };
  }

  async clearMemories(input: ClearMemoryRequest): Promise<{ cleared: number }> {
    const cleared = await this.memoryRepository.softDelete(input.sessionId, input.memoryIds);
    return { cleared };
  }

  async sessionSummary(sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new ApiError({
        code: 'SESSION_NOT_FOUND',
        status: 404,
        message: 'Session not found'
      });
    }

    const memoryCount = await this.memoryRepository.countActive(sessionId);
    const lastAccessedAt = await this.memoryRepository.latestAccessed(sessionId);

    return {
      id: session.id,
      externalId: session.externalId,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      memoryCount,
      lastAccessedAt: lastAccessedAt?.toISOString() || null
    };
  }

  async pruneOldMemories(params?: {
    maxAgeDays?: number;
    inactiveDays?: number;
    importanceThreshold?: number;
    take?: number;
  }): Promise<{ pruned: number; candidates: number }> {
    const now = new Date();
    const maxAgeDays = params?.maxAgeDays ?? env.prune.maxAgeDays;
    const inactiveDays = params?.inactiveDays ?? env.prune.inactiveDays;
    const importanceThreshold =
      params?.importanceThreshold ?? env.prune.importanceThreshold;
    const take = params?.take ?? 500;

    const createdBefore = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);
    const lastAccessedBefore = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000);

    const candidates = await this.memoryRepository.findPrunable({
      createdBefore,
      lastAccessedBefore,
      maxImportance: importanceThreshold,
      take
    });

    const pruned = await this.memoryRepository.softDeleteByIds(candidates.map((c) => c.id));
    return { pruned, candidates: candidates.length };
  }
}

