/**
 * TypeScript types for MemVault SDK
 */

export interface MemVaultOptions {
  /** Base URL of the MemVault API */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts for failed requests */
  maxRetries?: number;
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  importance: number;
  consolidated: boolean;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  description: string;
  importance: number;
  lastMentioned: string;
}

export interface Relationship {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  type: string;
  strength: number;
  description: string;
}

export interface GraphRAGResult {
  answer: string;
  entities: Entity[];
  relationships: Relationship[];
  relevantMemories: Memory[];
  confidence: number;
  reasoning: string;
}

export interface User {
  id: string;
  email: string | null;
  createdAt: string;
  tier: string;
  creditsBalance: number;
  stripeCustomerId?: string | null;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string | null;
  createdAt: string;
  lastUsed: string | null;
}

export interface AddMemoryResponse {
  message: string;
  jobId: string;
  userId: string;
  source: string;
  graphExtractionEnabled: boolean;
}

export interface RetrieveResponse {
  query: string;
  userId: string;
  stats: {
    memoriesFound: number;
    entitiesFound: number;
    graphNodesTraversed: number;
    totalTokens: number;
    durationMs: number;
  };
  memories: Memory[];
  entities: Entity[];
  graphNodes: any[];
  context: string;
}

export interface AskResponse {
  answer: string;
  sources: Memory[];
  entities: Entity[];
  confidence: number;
  reasoning: string;
}
