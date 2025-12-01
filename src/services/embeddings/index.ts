import { env } from '../../config';
import { EmbeddingProvider } from './EmbeddingProvider';
import { OllamaProvider } from './OllamaProvider';
import { OpenAIEmbeddingProvider } from './OpenAIEmbeddingProvider';

class NoOpEmbeddingProvider implements EmbeddingProvider {
  isEnabled(): boolean {
    return false;
  }
  generateEmbedding(): Promise<number[]> {
    return Promise.resolve([]);
  }
}

let provider: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (provider) {
    return provider;
  }

  if (!env.embeddingsEnabled) {
    provider = new NoOpEmbeddingProvider();
    return provider;
  }

  switch (env.embeddingProvider) {
    case 'openai':
      provider = new OpenAIEmbeddingProvider();
      break;
    case 'ollama':
      provider = new OllamaProvider();
      break;
    default:
      throw new Error(`Invalid embedding provider: ${env.embeddingProvider}`);
  }

  return provider;
}
