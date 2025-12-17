/**
 * MemVault SDK - Main Client
 */

import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import {
  MemVaultOptions,
  AddMemoryResponse,
  RetrieveResponse,
  AskResponse,
  User,
  ApiKey,
} from './types';
import {
  MemVaultError,
  AuthenticationError,
  RateLimitError,
  InsufficientCreditsError,
  ValidationError,
} from './errors';

const DEFAULT_BASE_URL = 'https://moderate-krystal-memvault-af80fe26.koyeb.app';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;

export class MemVault {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(apiKey: string, options: MemVaultOptions = {}) {
    if (!apiKey || !apiKey.startsWith('sk_')) {
      throw new ValidationError('Invalid API key format. Must start with "sk_"');
    }

    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;
  }

  /**
   * Add a memory to the knowledge graph (async processing)
   * 
   * @param content - The memory content to store
   * @param metadata - Optional metadata
   * @returns Job ID for tracking
   */
  async addMemory(
    content: string,
    metadata?: Record<string, any>
  ): Promise<AddMemoryResponse> {
    if (!content || content.trim().length === 0) {
      throw new ValidationError('Memory content cannot be empty');
    }

    const userId = await this.getUserId();

    return this.request<AddMemoryResponse>('POST', '/api/memory/add', {
      userId,
      text: content,
      metadata,
    });
  }

  /**
   * Retrieve memories from the knowledge graph
   * 
   * @param query - Search query
   * @param options - Optional search parameters
   * @returns Relevant memories, entities, and relationships
   */
  async retrieve(
    query: string,
    options?: {
      limit?: number;
      includeEntities?: boolean;
      includeRelationships?: boolean;
    }
  ): Promise<RetrieveResponse> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Query cannot be empty');
    }

    return this.request<RetrieveResponse>('POST', '/api/graphrag/retrieve', {
      userId: await this.getUserId(),
      query,
      limit: options?.limit || 10,
      includeEntities: options?.includeEntities !== false,
      includeRelationships: options?.includeRelationships !== false,
    });
  }

  /**
   * Ask a question and get an AI-generated answer from your knowledge graph
   * 
   * @param question - The question to ask
   * @returns Answer with sources and reasoning
   */
  async ask(question: string): Promise<AskResponse> {
    if (!question || question.trim().length === 0) {
      throw new ValidationError('Question cannot be empty');
    }

    return this.request<AskResponse>('POST', '/api/graphrag/ask', {
      userId: await this.getUserId(),
      question,
    });
  }

  /**
   * Get current user information
   * 
   * @returns User details including billing info
   */
  async getUser(): Promise<User> {
    return this.request<User>('GET', '/api/user/me');
  }

  /**
   * List all API keys for the current user
   * 
   * @returns Array of API keys
   */
  async listApiKeys(): Promise<ApiKey[]> {
    const response = await this.request<{ apiKeys: ApiKey[] }>('GET', '/api/user/api-keys');
    return response.apiKeys;
  }

  /**
   * Delete an API key
   * 
   * @param keyId - ID of the API key to delete
   */
  async deleteApiKey(keyId: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/api/user/api-keys/${keyId}`);
  }

  /**
   * Get user ID (cached from first request)
   */
  private async getUserId(): Promise<string> {
    if (!this._cachedUserId) {
      const user = await this.getUser();
      this._cachedUserId = user.id;
    }
    return this._cachedUserId;
  }
  private _cachedUserId?: string;

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.makeRequest<T>(method, path, body);
      } catch (error: any) {
        lastError = error;

        // Don't retry authentication or validation errors
        if (
          error instanceof AuthenticationError ||
          error instanceof ValidationError
        ) {
          throw error;
        }

        // Don't retry rate limit errors
        if (error instanceof RateLimitError) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new MemVaultError('Request failed after retries');
  }

  /**
   * Make a single HTTP request
   */
  private makeRequest<T>(method: string, path: string, body?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const options = {
        method,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': '@memvault/client/1.0.0',
        },
        timeout: this.timeout,
      };

      const req = lib.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};

            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(this.handleErrorResponse(res.statusCode || 500, parsed));
            }
          } catch (error) {
            reject(new MemVaultError('Failed to parse response'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new MemVaultError(`Network error: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new MemVaultError('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Handle error responses
   */
  private handleErrorResponse(statusCode: number, response: any): Error {
    const message = response.error || response.message || 'Request failed';

    switch (statusCode) {
      case 401:
        return new AuthenticationError(message);
      case 402:
        return new InsufficientCreditsError(message);
      case 429:
        return new RateLimitError(message);
      case 400:
        return new ValidationError(message);
      default:
        return new MemVaultError(message, statusCode, response);
    }
  }
}
