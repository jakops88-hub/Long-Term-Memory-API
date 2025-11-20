import { Session } from '@prisma/client';
import { prisma } from '../config';

export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  upsert(id: string, externalId?: string | null): Promise<Session>;
  countMemories(id: string): Promise<number>;
  summary(id: string): Promise<{
    session: Session | null;
    memoryCount: number;
    lastAccessedAt: Date | null;
  }>;
}

export class SessionRepository implements ISessionRepository {
  async findById(id: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { id } });
  }

  async upsert(id: string, externalId?: string | null): Promise<Session> {
    return prisma.session.upsert({
      where: { id },
      create: { id, externalId },
      update: { externalId }
    });
  }

  async countMemories(id: string): Promise<number> {
    return prisma.memory.count({ where: { sessionId: id, isDeleted: false } });
  }

  async summary(id: string): Promise<{
    session: Session | null;
    memoryCount: number;
    lastAccessedAt: Date | null;
  }> {
    const session = await this.findById(id);
    if (!session) {
      return { session: null, memoryCount: 0, lastAccessedAt: null };
    }

    const memoryCount = await this.countMemories(id);
    const lastAccessed = await prisma.memory.findFirst({
      where: { sessionId: id, isDeleted: false },
      orderBy: { lastAccessedAt: 'desc' },
      select: { lastAccessedAt: true }
    });

    return {
      session,
      memoryCount,
      lastAccessedAt: lastAccessed?.lastAccessedAt || null
    };
  }
}
