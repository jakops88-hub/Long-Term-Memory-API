export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  isEnabled(): boolean;
}
