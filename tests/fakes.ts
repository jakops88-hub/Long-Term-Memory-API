import { Memory, Prisma, Session } from '@prisma/client';
import { randomUUID } from 'crypto';
import { IMemoryRepository, MemoryCreateInput } from '../src/repositories/memoryRepository';
import { ISessionRepository } from '../src/repositories/sessionRepository';
import { EmbeddingProvider } from '../src/services/embeddings/EmbeddingProvider';

export class FakeMemoryRepository implements IMemoryRepository {
  private memories: Memory[] = [];

  async create(data: MemoryCreateInput): Promise<Memory> {
    const memory: Memory = {
      id: randomUUID(),
      sessionId: data.sessionId,
      text: data.text,
      compressedText: data.compressedText,
      metadata: (data.metadata as Prisma.JsonValue) ?? null,
      importanceScore: data.importanceScore,
      recencyScore: data.recencyScore ?? null,
      embedding: data.embedding ?? null,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      isDeleted: false
    };
    this.memories.push(memory);
    return memory;
  }

  async listActiveBySession(sessionId: string, take = 200): Promise<Memory[]> {
    return this.memories
      .filter((m) => m.sessionId === sessionId && !m.isDeleted)
      .sort((a, b) => b.importanceScore - a.importanceScore || b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take);
  }

  async updateLastAccessed(ids: string[], timestamp: Date): Promise<void> {
    this.memories = this.memories.map((m) =>
      ids.includes(m.id) ? { ...m, lastAccessedAt: timestamp } : m
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

  async countActive(sessionId: string): Promise<number> {
    return this.memories.filter((m) => m.sessionId === sessionId && !m.isDeleted).length;
  }

  async latestAccessed(sessionId: string): Promise<Date | null> {
    const latest = this.memories
      .filter((m) => m.sessionId === sessionId && !m.isDeleted)
      .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())[0];
    return latest?.lastAccessedAt ?? null;
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
    return Array.from({ length: 8 }, (_v, idx) => ((seed + idx * 7) % 1000) / 1000);
  }
}
