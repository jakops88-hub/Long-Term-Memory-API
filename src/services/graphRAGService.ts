import { prisma } from '../config/prisma';
import { EmbeddingProvider } from './embeddings/EmbeddingProvider';

export interface RetrieveOptions {
  userId: string;
  query: string;
  maxMemories?: number;
  maxEntities?: number;
  graphDepth?: number;
  minSimilarity?: number;
}

export interface EntityMatch {
  id: string;
  name: string;
  type: string;
  description: string | null;
  similarity: number;
  importance: number;
}

export interface MemoryMatch {
  id: string;
  text: string;
  similarity: number;
  importanceScore: number;
  createdAt: Date;
}

export interface GraphNode {
  entityId: string;
  entityName: string;
  entityType: string;
  depth: number;
  path: string;
  relationshipChain: string | null;
}

export interface GraphRAGResult {
  // Direct matches
  memories: MemoryMatch[];
  entities: EntityMatch[];
  
  // Graph traversal results
  graphNodes: GraphNode[];
  
  // Synthesized context
  contextSummary: string;
  totalTokens: number;
}

export class GraphRAGService {
  constructor(private embeddingProvider: EmbeddingProvider) {}

  /**
   * Main retrieval function with GraphRAG
   */
  async retrieve(options: RetrieveOptions): Promise<GraphRAGResult> {
    const {
      userId,
      query,
      maxMemories = 5,
      maxEntities = 5,
      graphDepth = 2,
      minSimilarity = 0.3
    } = options;

    // Generate query embedding
    const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    // ========================================================================
    // STEP 1: Vector Search - Find top Memories
    // ========================================================================
    const memories = await this.findSimilarMemories(
      userId,
      embeddingString,
      maxMemories,
      minSimilarity
    );

    console.log(`Found ${memories.length} similar memories`);

    // ========================================================================
    // STEP 2: Vector Search - Find top Entities
    // ========================================================================
    const entities = await this.findSimilarEntities(
      userId,
      embeddingString,
      maxEntities,
      minSimilarity
    );

    console.log(`Found ${entities.length} similar entities`);

    // ========================================================================
    // STEP 3: Graph Traversal - Multi-hop reasoning
    // ========================================================================
    const graphNodes = await this.traverseGraph(
      userId,
      entities.map(e => e.id),
      graphDepth
    );

    console.log(`Traversed graph: ${graphNodes.length} related nodes found`);

    // ========================================================================
    // STEP 4: Synthesis - Build context string
    // ========================================================================
    const contextSummary = this.synthesizeContext(memories, entities, graphNodes);
    const totalTokens = Math.ceil(contextSummary.length / 4);

    return {
      memories,
      entities,
      graphNodes,
      contextSummary,
      totalTokens
    };
  }

  /**
   * Find similar memories using vector search
   */
  private async findSimilarMemories(
    userId: string,
    embeddingString: string,
    limit: number,
    minSimilarity: number
  ): Promise<MemoryMatch[]> {
    const results = await prisma.$queryRaw<MemoryMatch[]>`
      SELECT
        id,
        text,
        "importanceScore",
        "createdAt",
        1 - (embedding <=> ${embeddingString}::vector) as similarity
      FROM "Memory"
      WHERE
        "userId" = ${userId} AND
        "isDeleted" = false AND
        embedding IS NOT NULL AND
        1 - (embedding <=> ${embeddingString}::vector) >= ${minSimilarity}
      ORDER BY
        1 - (embedding <=> ${embeddingString}::vector) DESC
      LIMIT ${limit}
    `;

    return results;
  }

  /**
   * Find similar entities using vector search
   */
  private async findSimilarEntities(
    userId: string,
    embeddingString: string,
    limit: number,
    minSimilarity: number
  ): Promise<EntityMatch[]> {
    const results = await prisma.$queryRaw<EntityMatch[]>`
      SELECT
        id,
        name,
        type,
        description,
        importance,
        1 - (embedding <=> ${embeddingString}::vector) as similarity
      FROM "Entity"
      WHERE
        "userId" = ${userId} AND
        "isDeleted" = false AND
        embedding IS NOT NULL AND
        1 - (embedding <=> ${embeddingString}::vector) >= ${minSimilarity}
      ORDER BY
        1 - (embedding <=> ${embeddingString}::vector) DESC
      LIMIT ${limit}
    `;

    return results;
  }

  /**
   * Multi-hop graph traversal using recursive CTE
   * THE SECRET SAUCE: Discovers related concepts through relationship chains
   */
  private async traverseGraph(
    userId: string,
    anchorEntityIds: string[],
    maxDepth: number
  ): Promise<GraphNode[]> {
    if (anchorEntityIds.length === 0) {
      return [];
    }

    // Build the recursive CTE query
    const results = await prisma.$queryRaw<GraphNode[]>`
      WITH RECURSIVE entity_graph AS (
        -- Base case: Start with anchor entities (depth 0)
        SELECT
          e.id as "entityId",
          e.name as "entityName",
          e.type as "entityType",
          0 as depth,
          e.name as path,
          NULL::text as "relationshipChain"
        FROM "Entity" e
        WHERE
          e.id = ANY(${anchorEntityIds}::text[]) AND
          e."userId" = ${userId} AND
          e."isDeleted" = false

        UNION ALL

        -- Recursive case: Follow relationships outward
        SELECT
          target.id as "entityId",
          target.name as "entityName",
          target.type as "entityType",
          eg.depth + 1 as depth,
          eg.path || ' -> ' || target.name as path,
          CASE
            WHEN eg."relationshipChain" IS NULL
            THEN r.predicate
            ELSE eg."relationshipChain" || ' -> ' || r.predicate
          END as "relationshipChain"
        FROM entity_graph eg
        INNER JOIN "Relationship" r ON r."fromEntityId" = eg."entityId"
        INNER JOIN "Entity" target ON target.id = r."toEntityId"
        WHERE
          eg.depth < ${maxDepth} AND
          r."userId" = ${userId} AND
          r."isDeleted" = false AND
          target."isDeleted" = false AND
          -- Prevent cycles: don't revisit entities already in path
          target.name != ALL(string_to_array(eg.path, ' -> '))
      )
      SELECT DISTINCT
        "entityId",
        "entityName",
        "entityType",
        depth,
        path,
        "relationshipChain"
      FROM entity_graph
      WHERE depth > 0  -- Exclude anchors (we already have them)
      ORDER BY depth ASC, "entityName" ASC
      LIMIT 50;  -- Safety limit to prevent explosion
    `;

    return results;
  }

  /**
   * Synthesize all results into a coherent context string
   */
  private synthesizeContext(
    memories: MemoryMatch[],
    entities: EntityMatch[],
    graphNodes: GraphNode[]
  ): string {
    let context = '';

    // Section 1: Direct Memory Matches
    if (memories.length > 0) {
      context += '=== RELEVANT MEMORIES ===\n\n';
      memories.forEach((m, idx) => {
        context += `[${idx + 1}] (Similarity: ${m.similarity.toFixed(2)}, Importance: ${m.importanceScore.toFixed(2)})\n`;
        context += `${m.text}\n\n`;
      });
    }

    // Section 2: Key Entities
    if (entities.length > 0) {
      context += '=== KEY ENTITIES ===\n\n';
      entities.forEach((e) => {
        context += `• ${e.name} (${e.type})`;
        if (e.description) {
          context += `: ${e.description}`;
        }
        context += ` [Relevance: ${e.similarity.toFixed(2)}]\n`;
      });
      context += '\n';
    }

    // Section 3: Knowledge Graph (The Magic!)
    if (graphNodes.length > 0) {
      context += '=== KNOWLEDGE GRAPH (Multi-hop Reasoning) ===\n\n';
      
      // Group by depth for clarity
      const nodesByDepth = new Map<number, GraphNode[]>();
      graphNodes.forEach(node => {
        if (!nodesByDepth.has(node.depth)) {
          nodesByDepth.set(node.depth, []);
        }
        nodesByDepth.get(node.depth)!.push(node);
      });

      nodesByDepth.forEach((nodes, depth) => {
        context += `Depth ${depth} (${depth} hop${depth > 1 ? 's' : ''} away):\n`;
        nodes.forEach(node => {
          context += `  • ${node.entityName} (${node.entityType})`;
          if (node.relationshipChain) {
            context += `\n    Via: ${node.relationshipChain}`;
          }
          context += `\n    Path: ${node.path}\n`;
        });
        context += '\n';
      });
    }

    if (!context) {
      context = 'No relevant information found.';
    }

    return context.trim();
  }

  /**
   * Helper: Format graph path for human readability
   */
  private formatGraphPath(path: string, relationshipChain: string | null): string {
    const entities = path.split(' -> ');
    const predicates = relationshipChain?.split(' -> ') || [];
    
    let formatted = entities[0];
    for (let i = 0; i < predicates.length; i++) {
      formatted += ` --[${predicates[i]}]--> ${entities[i + 1]}`;
    }
    
    return formatted;
  }
}
