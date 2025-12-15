/**
 * Consolidation Service - "Sleep Cycles" for Memory Compression
 * 
 * This service runs periodically to:
 * 1. Summarize unconsolidated memories into core facts
 * 2. Update entity descriptions with new insights
 * 3. Prune redundant memories
 * 4. Maintain knowledge graph health
 * 
 * Cost Protection: Only runs for users with sufficient credits
 */

import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { CostGuard } from './hybridCostGuard';
import { UserContext } from '../types/billing';
import OpenAI from 'openai';
import { env } from '../config';

const openai = new OpenAI({ apiKey: env.openAiApiKey });

interface ConsolidationResult {
  userId: string;
  memoriesProcessed: number;
  entitiesUpdated: number;
  coreFacts: string[];
  cost: number;
  skipped: boolean;
  reason?: string;
}

interface CoreFact {
  entityName: string;
  entityType: string;
  fact: string;
  confidence: number;
}

export class ConsolidationService {
  private static readonly CONSOLIDATION_WINDOW_HOURS = 24;
  private static readonly MIN_MEMORIES_FOR_CONSOLIDATION = 5;
  private static readonly ESTIMATED_TOKENS_PER_MEMORY = 200;
  private static readonly MAX_MEMORIES_PER_BATCH = 50;

  /**
   * Run consolidation for a specific user
   * 
   * @param userId - User to consolidate memories for
   * @returns Consolidation result
   */
  static async consolidateUser(userId: string): Promise<ConsolidationResult> {
    logger.info('Starting consolidation cycle', { userId });

    try {
      // Get user context for cost guard
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { billing: true }
      });

      if (!user || !user.billing) {
        return {
          userId,
          memoriesProcessed: 0,
          entitiesUpdated: 0,
          coreFacts: [],
          cost: 0,
          skipped: true,
          reason: 'User or billing info not found'
        };
      }

      const userContext: UserContext = {
        userId,
        source: 'DIRECT', // Only Direct users get consolidation
        tier: user.billing.tier as any,
        balance: user.billing.creditsBalance
      };

      // SAFETY CHECK: Skip RapidAPI users (we can't bill them for background work)
      if (userContext.source === 'RAPIDAPI') {
        logger.info('Skipping consolidation for RapidAPI user', { userId });
        return {
          userId,
          memoriesProcessed: 0,
          entitiesUpdated: 0,
          coreFacts: [],
          cost: 0,
          skipped: true,
          reason: 'RapidAPI users not eligible for background consolidation'
        };
      }

      // Fetch unconsolidated memories
      const memories = await this.fetchUnconsolidatedMemories(userId);

      if (memories.length < this.MIN_MEMORIES_FOR_CONSOLIDATION) {
        logger.info('Not enough memories to consolidate', { 
          userId, 
          count: memories.length,
          minimum: this.MIN_MEMORIES_FOR_CONSOLIDATION
        });
        return {
          userId,
          memoriesProcessed: 0,
          entitiesUpdated: 0,
          coreFacts: [],
          cost: 0,
          skipped: true,
          reason: `Only ${memories.length} unconsolidated memories (need ${this.MIN_MEMORIES_FOR_CONSOLIDATION})`
        };
      }

      // Estimate cost
      const estimatedTokens = memories.length * this.ESTIMATED_TOKENS_PER_MEMORY;
      const estimatedCost = CostGuard.calculateEstimatedCost(
        estimatedTokens,
        false, // No embedding generation
        true   // Complex LLM task (summarization)
      );

      logger.info('Estimated consolidation cost', { 
        userId, 
        memories: memories.length,
        estimatedTokens,
        estimatedCost
      });

      // PRE-FLIGHT CHECK: Ensure user has credits
      try {
        const accessCheck = await CostGuard.checkAccess(userId, userContext, estimatedCost);
        
        if (!accessCheck.allowed || !accessCheck.allowBackgroundJobs) {
          logger.warn('Consolidation blocked by cost guard', { 
            userId,
            allowed: accessCheck.allowed,
            backgroundJobsAllowed: accessCheck.allowBackgroundJobs,
            balance: userContext.balance
          });
          return {
            userId,
            memoriesProcessed: 0,
            entitiesUpdated: 0,
            coreFacts: [],
            cost: 0,
            skipped: true,
            reason: 'Insufficient credits or background jobs disabled'
          };
        }
      } catch (error: any) {
        logger.error('Cost guard check failed', { userId, error: error.message });
        return {
          userId,
          memoriesProcessed: 0,
          entitiesUpdated: 0,
          coreFacts: [],
          cost: 0,
          skipped: true,
          reason: `Cost check failed: ${error.message}`
        };
      }

      // CONSOLIDATION: Extract core facts from memories
      const { coreFacts, usage } = await this.extractCoreFacts(userId, memories);

      logger.info('Extracted core facts', { 
        userId, 
        factsCount: coreFacts.length,
        tokensUsed: usage?.total_tokens
      });

      // UPDATE: Apply facts to entities
      const entitiesUpdated = await this.applyFactsToEntities(userId, coreFacts);

      // MARK: Flag memories as consolidated
      await this.markAsConsolidated(memories.map(m => m.id));

      // DEDUCT: Charge for the consolidation
      const actualCost = CostGuard.calculateEstimatedCost(
        usage?.total_tokens || estimatedTokens,
        false,
        true
      );

      await CostGuard.deduct(userId, userContext, actualCost);

      logger.info('Consolidation cycle completed', { 
        userId,
        memoriesProcessed: memories.length,
        entitiesUpdated,
        cost: actualCost
      });

      return {
        userId,
        memoriesProcessed: memories.length,
        entitiesUpdated,
        coreFacts: coreFacts.map(f => f.fact),
        cost: actualCost,
        skipped: false
      };

    } catch (error: any) {
      logger.error('Consolidation failed', { 
        userId, 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Fetch unconsolidated memories from the last 24 hours
   */
  private static async fetchUnconsolidatedMemories(userId: string) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - this.CONSOLIDATION_WINDOW_HOURS);

    return prisma.memory.findMany({
      where: {
        userId,
        isConsolidated: false,
        isDeleted: false,
        createdAt: {
          gte: cutoffDate
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: this.MAX_MEMORIES_PER_BATCH,
      select: {
        id: true,
        text: true,
        importanceScore: true,
        createdAt: true
      }
    });
  }

  /**
   * Use LLM to extract core facts from memories
   */
  private static async extractCoreFacts(
    userId: string, 
    memories: Array<{ id: string; text: string; importanceScore: number }>
  ): Promise<{ coreFacts: CoreFact[]; usage: any }> {
    const memoryTexts = memories.map((m, idx) => 
      `[${idx + 1}] (importance: ${m.importanceScore.toFixed(2)}) ${m.text}`
    ).join('\n');

    const systemPrompt = `You are a memory consolidation AI. Your job is to analyze a user's recent memories and extract core facts that should be permanently stored in their knowledge graph.

Guidelines:
1. Identify key entities (people, projects, events, concepts)
2. Extract lasting facts (not temporary states)
3. Merge redundant information
4. Assign confidence scores (0.0-1.0)

Output format (JSON array):
[
  {
    "entityName": "EntityName",
    "entityType": "Person|Project|Event|Concept",
    "fact": "Clear, concise fact about the entity",
    "confidence": 0.95
  }
]

Only output valid JSON. No explanations.`;

    const userPrompt = `Consolidate these ${memories.length} memories into core facts:

${memoryTexts}

Extract lasting facts about entities. Focus on important information (importance > 0.6).`;

    try {
      const response = await openai.chat.completions.create({
        model: env.llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content || '{"facts": []}';
      const parsed = JSON.parse(content);
      const coreFacts: CoreFact[] = parsed.facts || parsed.coreFacts || parsed;

      return {
        coreFacts: Array.isArray(coreFacts) ? coreFacts : [],
        usage: response.usage
      };
    } catch (error: any) {
      logger.error('Failed to extract core facts', { 
        userId, 
        error: error.message 
      });
      return { coreFacts: [], usage: null };
    }
  }

  /**
   * Apply extracted facts to entities
   */
  private static async applyFactsToEntities(
    userId: string, 
    coreFacts: CoreFact[]
  ): Promise<number> {
    let updatedCount = 0;

    for (const fact of coreFacts) {
      try {
        // Find or create entity
        const entity = await prisma.entity.findFirst({
          where: {
            userId,
            name: fact.entityName,
            type: fact.entityType,
            isDeleted: false
          }
        });

        if (entity) {
          // Update existing entity description
          const currentDesc = entity.description || '';
          const newDesc = this.mergeDescriptions(currentDesc, fact.fact);

          await prisma.entity.update({
            where: { id: entity.id },
            data: {
              description: newDesc,
              importance: Math.max(entity.importance, fact.confidence * 0.8),
              lastAccessedAt: new Date(),
              updatedAt: new Date()
            }
          });

          updatedCount++;
          logger.debug('Updated entity with consolidation fact', { 
            userId,
            entityName: fact.entityName,
            entityType: fact.entityType
          });
        } else {
          // Entity doesn't exist - skip (we only update existing entities during consolidation)
          logger.debug('Entity not found for fact - skipping', { 
            userId,
            entityName: fact.entityName
          });
        }
      } catch (error: any) {
        logger.error('Failed to apply fact to entity', { 
          userId,
          fact,
          error: error.message
        });
      }
    }

    return updatedCount;
  }

  /**
   * Merge new fact into existing description
   */
  private static mergeDescriptions(current: string, newFact: string): string {
    if (!current) return newFact;
    
    // Avoid duplicates
    if (current.toLowerCase().includes(newFact.toLowerCase())) {
      return current;
    }

    // Append new fact
    return `${current}. ${newFact}`.trim();
  }

  /**
   * Mark memories as consolidated
   */
  private static async markAsConsolidated(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) return;

    await prisma.memory.updateMany({
      where: {
        id: { in: memoryIds }
      },
      data: {
        isConsolidated: true,
        lastAccessedAt: new Date()
      }
    });

    logger.info('Marked memories as consolidated', { count: memoryIds.length });
  }

  /**
   * Run consolidation for all eligible users
   * (Called by cron job)
   */
  static async consolidateAllUsers(): Promise<ConsolidationResult[]> {
    logger.info('Starting batch consolidation for all users');

    // Find users with unconsolidated memories
    const usersWithMemories = await prisma.memory.groupBy({
      by: ['userId'],
      where: {
        isConsolidated: false,
        isDeleted: false,
        createdAt: {
          gte: new Date(Date.now() - this.CONSOLIDATION_WINDOW_HOURS * 60 * 60 * 1000)
        }
      },
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gte: this.MIN_MEMORIES_FOR_CONSOLIDATION
          }
        }
      }
    });

    logger.info(`Found ${usersWithMemories.length} users eligible for consolidation`);

    const results: ConsolidationResult[] = [];

    for (const { userId } of usersWithMemories) {
      try {
        const result = await this.consolidateUser(userId);
        results.push(result);
      } catch (error: any) {
        logger.error('User consolidation failed', { userId, error: error.message });
        results.push({
          userId,
          memoriesProcessed: 0,
          entitiesUpdated: 0,
          coreFacts: [],
          cost: 0,
          skipped: true,
          reason: `Error: ${error.message}`
        });
      }
    }

    const successful = results.filter(r => !r.skipped).length;
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);

    logger.info('Batch consolidation completed', {
      totalUsers: results.length,
      successful,
      skipped: results.length - successful,
      totalCost
    });

    return results;
  }
}
