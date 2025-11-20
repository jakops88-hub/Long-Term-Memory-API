import { Memory, Prisma } from '@prisma/client';
import { prisma } from '../config';

export interface MemoryCreateInput {
  sessionId: string;
  text: string;
  compressedText: string;
  metadata?: Prisma.InputJsonValue;
  importanceScore: number;
  recencyScore?: number;
  embedding?: number[];
}

export interface IMemoryRepository {
  create(data: MemoryCreateInput): Promise<Memory>;
  listActiveBySession(sessionId: string, take?: number): Promise<Memory[]>;
  updateLastAccessed(ids: string[], timestamp: Date): Promise<void>;
  softDelete(sessionId: string, memoryIds?: string[]): Promise<number>;
  countActive(sessionId: string): Promise<number>;
  latestAccessed(sessionId: string): Promise<Date | null>;
}

export class MemoryRepository implements IMemoryRepository {
  async create(data: MemoryCreateInput): Promise<Memory> {
    return prisma.memory.create({ data: { ...data, isDeleted: false } });
  }

  async listActiveBySession(sessionId: string, take = 200): Promise<Memory[]> {
    return prisma.memory.findMany({
      where: { sessionId, isDeleted: false },
      orderBy: [{ importanceScore: 'desc' }, { createdAt: 'desc' }],
      take
    });
  }

  async updateLastAccessed(ids: string[], timestamp: Date): Promise<void> {
    if (!ids.length) return;
    await prisma.memory.updateMany({
      where: { id: { in: ids } },
      data: { lastAccessedAt: timestamp }
    });
  }

  async softDelete(sessionId: string, memoryIds?: string[]): Promise<number> {
    const result = await prisma.memory.updateMany({
      where: {
        sessionId,
        isDeleted: false,
        ...(memoryIds ? { id: { in: memoryIds } } : {})
      },
      data: { isDeleted: true }
    });
    return result.count;
  }

  async countActive(sessionId: string): Promise<number> {
    return prisma.memory.count({ where: { sessionId, isDeleted: false } });
  }

  async latestAccessed(sessionId: string): Promise<Date | null> {
    const memory = await prisma.memory.findFirst({
      where: { sessionId, isDeleted: false },
      orderBy: { lastAccessedAt: 'desc' },
      select: { lastAccessedAt: true }
    });
    return memory?.lastAccessedAt || null;
  }
}
