import { Memory, Prisma } from '@prisma/client';
import { env, prisma } from '../config'; // FIX: Importerar env korrekt

export type MemoryWithSimilarity = Omit<Memory, 'embedding'> & { similarity: number };
export type DuplicateMemory = Pick<Memory, 'id'>;

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
  findById(id: string): Promise<Memory | null>;
  findSimilarMemories(
    sessionId: string,
    embedding: number[],
    limit: number,
    minScore: number
  ): Promise<MemoryWithSimilarity[]>;
  findDuplicate(sessionId: string, embedding: number[]): Promise<DuplicateMemory | null>;
  updateLastAccessed(ids: string[] | string, timestamp: Date): Promise<void>;
  softDelete(sessionId: string, memoryIds?: string[]): Promise<number>;
  softDeleteByIds(ids: string[]): Promise<number>;
  findPrunable(params: {
    createdBefore: Date;
    lastAccessedBefore: Date;
    maxImportance: number;
    take?: number;
  }): Promise<Memory[]>;
  countActive(sessionId: string): Promise<number>;
  latestAccessed(sessionId: string): Promise<Date | null>;
}

export class MemoryRepository implements IMemoryRepository {
  async create(data: MemoryCreateInput): Promise<Memory> {
    const { sessionId, text, compressedText, metadata, importanceScore, recencyScore, embedding } = data;
    const embeddingString = `[${(embedding ?? []).join(',')}]`;
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    const result = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Memory" (
        "id", "sessionId", "text", "compressedText", "metadata", "importanceScore", "recencyScore", "embedding"
      ) VALUES (
        gen_random_uuid(), ${sessionId}, ${text}, ${compressedText}, ${metadataJson}::jsonb, ${importanceScore}, ${recencyScore}, ${embeddingString}::vector
      )
      RETURNING "id"
    `;
    const newId = result[0].id;

    const newMemory = await this.findById(newId);
    if (!newMemory) {
      throw new Error('Failed to retrieve memory immediately after creation.');
    }
    return newMemory;
  }

  async findById(id: string): Promise<Memory | null> {
    return prisma.memory.findUnique({
      where: { id, isDeleted: false }
    });
  }

  async findSimilarMemories(
    sessionId: string,
    embedding: number[],
    limit: number,
    minScore: number
  ): Promise<MemoryWithSimilarity[]> {
    const embeddingString = `[${embedding.join(',')}]`;
    
    // Hämta vikter från env, med fallback om de saknas
    const simWeight = env.scoringWeights.similarity ?? 0.5;
    const impWeight = env.scoringWeights.importance ?? 0.3;

    // FIX: Vi använder hela uttrycket i ORDER BY för att undvika problem med alias
    // FIX: Vi castar parametern explicit till vector
    const results = await prisma.$queryRaw<MemoryWithSimilarity[]>`
      SELECT
        "id",
        "sessionId",
        "text",
        "compressedText",
        "metadata",
        "importanceScore",
        "recencyScore",
        "createdAt",
        "lastAccessedAt",
        "isDeleted",
        1 - (embedding <=> ${embeddingString}::vector) as similarity
      FROM "Memory"
      WHERE
        "sessionId" = ${sessionId} AND
        "isDeleted" = false AND
        1 - (embedding <=> ${embeddingString}::vector) >= ${minScore}
      ORDER BY
        (1 - (embedding <=> ${embeddingString}::vector)) * ${simWeight} + "importanceScore" * ${impWeight} DESC
      LIMIT ${limit}
    `;

    return results;
  }

  async findDuplicate(sessionId: string, embedding: number[]): Promise<DuplicateMemory | null> {
    const embeddingString = `[${embedding.join(',')}]`;
    const similarityThreshold = 0.95;

    const results = await prisma.$queryRaw<DuplicateMemory[]>`
      SELECT "id"
      FROM "Memory"
      WHERE
        "sessionId" = ${sessionId} AND
        "isDeleted" = false AND
        "createdAt" >= NOW() - interval '24 hours' AND
        1 - (embedding <=> ${embeddingString}::vector) > ${similarityThreshold}
      ORDER BY 1 - (embedding <=> ${embeddingString}::vector) DESC
      LIMIT 1
    `;

    return results.length > 0 ? results[0] : null;
  }

  async updateLastAccessed(ids: string[] | string, timestamp: Date): Promise<void> {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (!idList.length) return;

    await prisma.memory.updateMany({
      where: { id: { in: idList } },
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

  async softDeleteByIds(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const result = await prisma.memory.updateMany({
      where: { id: { in: ids }, isDeleted: false },
      data: { isDeleted: true }
    });
    return result.count;
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
    return prisma.memory.findMany({
      where: {
        isDeleted: false,
        createdAt: { lt: createdBefore },
        lastAccessedAt: { lt: lastAccessedBefore },
        importanceScore: { lte: maxImportance }
      },
      orderBy: [{ importanceScore: 'asc' }, { lastAccessedAt: 'asc' }],
      take
    });
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
