import axios from 'axios';
import { env, logger } from '../../config';
import { EmbeddingProvider } from './EmbeddingProvider';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.openAiApiKey;
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey) && env.embeddingsEnabled;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isEnabled()) {
      throw new Error('Embedding provider disabled');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: 'text-embedding-3-small'
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const embedding = response.data?.data?.[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response');
      }
      return embedding;
    } catch (error) {
      logger.error('OpenAI embedding error', { error: String(error) });
      throw new Error('Failed to generate embedding');
    }
  }
}
