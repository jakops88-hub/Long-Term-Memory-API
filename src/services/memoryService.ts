import { Memory, Prisma } from '@prisma/client';
import {
  ClearMemoryRequest,
  RetrieveMemoryRequest,
  RetrieveMemoryResponse,
  StoreMemoryRequest,
  StoreMemoryResponse
} from '../types/memory';
import { computeFinalScore } from '../utils/scoring';
import { compressText, computeImportanceScore, normalizeText, truncateIfNeeded } from '../utils/text';
import { IMemoryRepository } from '../repositories/memoryRepository';
import { ISessionRepository } from '../repositories/sessionRepository';
import { ApiError } from '../types/errors';
import { EmbeddingProvider } from './embeddings/EmbeddingProvider';

const cosineSimilarity = (a?: number[], b?: number[]): number => {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export class MemoryService {
  constructor(
    private memoryRepository: IMemoryRepository,
    private sessionRepository: ISessionRepository,
    private embeddingProvider?: EmbeddingProvider
  ) {}

  async storeMemory(input: StoreMemoryRequest): Promise<StoreMemoryResponse> {
    const normalizedText = normalizeText(truncateIfNeeded(input.text));
    const compressed = compressText(normalizedText);
    const importanceScore = computeImportanceScore(normalizedText, input.importanceHint);

    // Ensure session exists
    await this.sessionRepository.upsert(input.sessionId);

    let embedding: number[] | undefined;
    if (this.embeddingProvider?.isEnabled()) {
      try {
        embedding = await this.embeddingProvider.generateEmbedding(normalizedText);
      } catch (err) {
        // Proceed without embeddings if provider fails
        embedding = undefined;
      }
    }

    const created = await this.memoryRepository.create({
      sessionId: input.sessionId,
      text: normalizedText,
      compressedText: compressed,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      importanceScore,
      recencyScore: 1,
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
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new ApiError({
        code: 'SESSION_NOT_FOUND',
        status: 404,
        message: 'Session not found'
      });
    }

    const limit = input.limit ?? 5;
    const candidates = await this.memoryRepository.listActiveBySession(input.sessionId, 300);
    let queryEmbedding: number[] | undefined;

    if (this.embeddingProvider?.isEnabled()) {
      try {
        queryEmbedding = await this.embeddingProvider.generateEmbedding(normalizeText(input.query));
      } catch {
        queryEmbedding = undefined;
      }
    }

    const ranked = candidates
      .map((memory) => this.scoreMemory(memory, input.query, queryEmbedding, input.metadata))
      .filter((item) => item.finalScore > 0)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

    const ids = ranked.map((r) => r.memory.id);
    const accessTime = new Date();
    await this.memoryRepository.updateLastAccessed(ids, accessTime);

    return {
      sessionId: input.sessionId,
      query: input.query,
      results: ranked.map((item) => ({
        id: item.memory.id,
        text: item.memory.text,
        compressedText: item.memory.compressedText,
        importanceScore: item.memory.importanceScore,
        createdAt: item.memory.createdAt.toISOString(),
        lastAccessedAt: accessTime.toISOString(),
        metadata: (item.memory.metadata as Record<string, unknown> | null) || undefined
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

  private scoreMemory(
    memory: Memory,
    query: string,
    queryEmbedding?: number[],
    metadataFilter?: Record<string, unknown>
  ) {
    const similarity = queryEmbedding
      ? cosineSimilarity(queryEmbedding, memory.embedding || undefined)
      : this.keywordScore(memory.text, query);
    if (metadataFilter) {
      const matches = Object.entries(metadataFilter).every(
        ([key, value]) => (memory.metadata as Record<string, unknown> | undefined)?.[key] === value
      );
      if (!matches) return { memory, finalScore: 0, similarity: 0, recencyScore: 0 };
    }

    const recencyMs = Date.now() - memory.createdAt.getTime();
    const { finalScore, recencyScore } = computeFinalScore({
      similarity,
      recencyMs,
      importanceScore: memory.importanceScore
    });

    return {
      memory,
      finalScore,
      recencyScore,
      similarity
    };
  }

  private keywordScore(text: string, query: string): number {
    const queryTokens = normalizeText(query)
      .toLowerCase()
      .split(' ')
      .filter(Boolean);
    const textLower = normalizeText(text).toLowerCase();
    if (!queryTokens.length) return 0;
    const hits = queryTokens.filter((token) => textLower.includes(token)).length;
    return hits / queryTokens.length;
  }
}
