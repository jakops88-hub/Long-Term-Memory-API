export type ImportanceHint = 'low' | 'medium' | 'high';

export interface StoreMemoryRequest {
  sessionId: string;
  text: string;
  metadata?: Record<string, unknown>;
  importanceHint?: ImportanceHint;
}

export interface StoreMemoryResponse {
  id: string;
  sessionId: string;
  importanceScore: number;
  createdAt: string;
}

export interface RetrieveMemoryRequest {
  sessionId: string;
  query: string;
  limit?: number;
  minScore?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryResult {
  id: string;
  text: string;
  compressedText: string;
  importanceScore: number;
  similarity: number;
  createdAt: string;
  lastAccessedAt: string;
  metadata?: Record<string, unknown>;
  lowConfidence?: boolean;
}

export interface RetrieveMemoryResponse {
  sessionId: string;
  query: string;
  tokenUsage: number;
  results: MemoryResult[];
}

export interface ClearMemoryRequest {
  sessionId: string;
  memoryIds?: string[];
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  externalId?: string | null;
  memoryCount: number;
  lastAccessedAt?: string | null;
}