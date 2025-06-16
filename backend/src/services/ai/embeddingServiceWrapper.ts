import { googleEmbeddingService } from './googleEmbeddingService';

class EmbeddingServiceWrapper {
  async generateEmbedding(text: string): Promise<number[]> {
    const result = await googleEmbeddingService.generateEmbedding(text);
    return result.embedding;
  }
}

export const embeddingService = new EmbeddingServiceWrapper();