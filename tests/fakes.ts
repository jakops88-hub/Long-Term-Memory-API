import { Memory, Prisma, Session } from '@prisma/client';
import { randomUUID } from 'crypto';
import { IMemoryRepository, MemoryCreateInput } from '../src/repositories/memoryRepository';
import { ISessionRepository } from '../src/repositories/sessionRepository';
import { EmbeddingProvider } from '../src/services/embeddings/EmbeddingProvider';

export class FakeMemoryRepository implements IMemoryRepository {
  private memories: (Memory & { embedding: number[] })[] = [];

  async create(data: MemoryCreateInput): Promise<Memory> {
    const memory: Memory & { embedding: number[] } = {
      id: randomUUID(),
      sessionId: data.sessionId,
      text: data.text,
      compressedText: data.compressedText,
      metadata: (data.metadata as Prisma.JsonValue) ?? null,
      importanceScore: data.importanceScore,
      recencyScore: data.recencyScore ?? null,
      embedding: data.embedding ?? [],
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      isDeleted: false
    };
    this.memories.push(memory);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedding, ...rest } = memory;
    return rest;
  }

  async findById(id: string): Promise<Memory | null> {
    const memory = this.memories.find((m) => m.id === id && !m.isDeleted);
    if (!memory) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedding, ...rest } = memory;
    return Promise.resolve(rest);
  }

  async findSimilarMemories(
    sessionId: string,
    embedding: number[],
    limit: number,
    minScore: number,
    query?: string
  ): Promise<(Omit<Memory, 'embedding'> & { similarity: number })[]> {
    console.log('Called findSimilarMemories with:', { sessionId, embedding, limit, minScore, query });
    const similarMems = this.memories
      .filter((m) => m.sessionId === sessionId && !m.isDeleted)
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, limit)
      .map((m) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { embedding, ...rest } = m;
        return { ...rest, similarity: m.importanceScore };
      });

    return Promise.resolve(similarMems);
  }

  async findDuplicate(sessionId: string, embedding: number[]): Promise<{ id: string } | null> {
    console.log('Called findDuplicate with:', { sessionId, embedding });
    return Promise.resolve(null);
  }

  async listActiveBySession(sessionId: string, take = 200): Promise<Memory[]> {
    const activeMemories = this.memories
      .filter((m) => m.sessionId === sessionId && !m.isDeleted)
      .sort((a, b) => b.importanceScore - a.importanceScore || b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take);
    
    return activeMemories.map(m => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { embedding, ...rest } = m;
      return rest;
    });
  }


  async updateLastAccessed(ids: string[] | string, timestamp: Date): Promise<void> {
    const idList = Array.isArray(ids) ? ids : [ids];
    this.memories = this.memories.map((m) =>
      idList.includes(m.id) ? { ...m, lastAccessedAt: timestamp } : m
    );
  }

  async softDelete(sessionId: string, memoryIds?: string[]): Promise<number> {
    let count = 0;
    this.memories = this.memories.map((m) => {
      const shouldDelete =
        m.sessionId === sessionId && !m.isDeleted && (!memoryIds || memoryIds.includes(m.id));
      if (shouldDelete) {
        count += 1;
        return { ...m, isDeleted: true };
      }
      return m;
    });
    return count;
  }

  async softDeleteByIds(ids: string[]): Promise<number> {
    let count = 0;
    this.memories = this.memories.map((m) => {
      if (ids.includes(m.id) && !m.isDeleted) {
        count += 1;
        return { ...m, isDeleted: true };
      }
      return m;
    });
    return count;
  }

  async findPrunable({
    createdBefore,
    lastAccessedBefore,
    maxImportance,
    take = 200
  }: {
    createdBefore: Date;
    lastAccessedBefore: Date;
    maxImportance: number;
    take?: number;
  }): Promise<Memory[]> {
    const prunable = this.memories
      .filter(
        (m) =>
          !m.isDeleted &&
          m.createdAt < createdBefore &&
          m.lastAccessedAt < lastAccessedBefore &&
          m.importanceScore <= maxImportance
      )
      .sort((a, b) => a.importanceScore - b.importanceScore || a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime())
      .slice(0, take);

    return prunable.map(m => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { embedding, ...rest } = m;
      return rest;
    });
  }

  async countActive(sessionId: string): Promise<number> {
    return this.memories.filter((m) => m.sessionId === sessionId && !m.isDeleted).length;
  }

  async latestAccessed(sessionId: string): Promise<Date | null> {
    const latest = this.memories
      .filter((m) => m.sessionId === sessionId && !m.isDeleted)
      .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())[0];
    return latest?.lastAccessedAt ?? null;
  }

  // Test helper to mutate timestamps
  setTimestamps(id: string, createdAt: Date, lastAccessedAt: Date) {
    this.memories = this.memories.map((m) =>
      m.id === id ? { ...m, createdAt, lastAccessedAt } : m
    );
  }
}

export class FakeSessionRepository implements ISessionRepository {
  private sessions: Session[] = [];

  async findById(id: string): Promise<Session | null> {
    return this.sessions.find((s) => s.id === id) || null;
  }

  async upsert(id: string, externalId?: string | null): Promise<Session> {
    const existing = await this.findById(id);
    if (existing) {
      const updated = { ...existing, externalId: externalId ?? existing.externalId, updatedAt: new Date() };
      this.sessions = this.sessions.map((s) => (s.id === id ? updated : s));
      return updated;
    }
    const session: Session = {
      id,
      externalId: externalId ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.sessions.push(session);
    return session;
  }

  async countMemories(id: string): Promise<number> {
    // No-op here; callers in tests rely on MemoryRepository instead.
    return 0;
  }

  async summary(id: string) {
    const session = await this.findById(id);
    return { session, memoryCount: 0, lastAccessedAt: null };
  }
}

export class FakeEmbeddingProvider implements EmbeddingProvider {
  constructor(private vectorValue = 0.5, private enabled = true) {}

  isEnabled(): boolean {
    return this.enabled;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const seed = text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) * this.vectorValue;
    return Array.from({ length: 768 }, (_v, idx) => ((seed + idx * 7) % 1000) / 1000);
  }
}
