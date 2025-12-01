import { env, logger } from '../../config';
import { EmbeddingProvider } from './EmbeddingProvider';

export class OllamaProvider implements EmbeddingProvider {
  private ollamaUrl = env.ollamaUrl;
  private ollamaModel = env.ollamaModel;

  isEnabled(): boolean {
    return env.embeddingProvider === 'ollama' && env.embeddingsEnabled;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isEnabled()) {
      throw new Error('Ollama embedding provider is not enabled.');
    }

    try {
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const embedding = data?.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response from Ollama');
      }

      return embedding;
    } catch (error) {
      logger.error('Ollama embedding error', { error: String(error) });
      throw new Error(`Failed to generate embedding using Ollama: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
