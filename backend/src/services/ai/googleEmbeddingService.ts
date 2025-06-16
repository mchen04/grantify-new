import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../utils/logger';

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

class GoogleEmbeddingService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelConfig = {
    name: 'text-embedding-004',
    dimensions: 768,
    maxTokens: 2048,
    rateLimit: 1500 // requests per minute
  };

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.modelConfig.name });
  }

  /**
   * Generate embeddings for text using Google's text-embedding-004 model
   * @param text - The text to generate embeddings for
   * @returns Promise<EmbeddingResult> - The embedding vector and token count
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Truncate text if it exceeds max tokens (roughly 4 chars per token)
      const maxChars = this.modelConfig.maxTokens * 4;
      const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
      
      logger.info(`Generating embedding for text (${truncatedText.length} chars) with ${this.modelConfig.name}`);
      
      // Generate embedding
      const result = await this.model.embedContent(truncatedText);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error('No embedding data received from Google');
      }

      // The embedding values are in result.embedding.values
      const embedding = result.embedding.values;
      
      // Estimate tokens (Google doesn't return exact token count for embeddings)
      const estimatedTokens = Math.ceil(truncatedText.length / 4);
      
      return {
        embedding: embedding,
        tokens: estimatedTokens
      };
    } catch (error) {
      logger.error('Error generating Google embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to generate embeddings for
   * @returns Promise<EmbeddingResult[]> - Array of embedding results
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      if (!texts || texts.length === 0) {
        throw new Error('Texts array cannot be empty');
      }

      // Filter out empty texts
      const validTexts = texts.filter(text => text && text.trim().length > 0);
      if (validTexts.length === 0) {
        throw new Error('All texts are empty');
      }

      // Truncate texts if needed
      const maxChars = this.modelConfig.maxTokens * 4;
      const truncatedTexts = validTexts.map(text => 
        text.length > maxChars ? text.substring(0, maxChars) : text
      );

      logger.info(`Generating embeddings for ${truncatedTexts.length} texts with ${this.modelConfig.name}`);
      
      // Process texts one by one (Google's embedding API doesn't support batch)
      // We'll add rate limiting if needed
      const results: EmbeddingResult[] = [];
      
      for (let i = 0; i < truncatedTexts.length; i++) {
        const result = await this.generateEmbedding(truncatedTexts[i]);
        results.push(result);
        
        // Add small delay to respect rate limits (1500 RPM = 25 RPS = 40ms between requests)
        if (i < truncatedTexts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      return results;
    } catch (error) {
      logger.error('Error generating Google embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getModelInfo() {
    return {
      model: this.modelConfig.name,
      dimensions: this.modelConfig.dimensions,
      maxTokens: this.modelConfig.maxTokens,
      rateLimit: this.modelConfig.rateLimit
    };
  }
}

export const googleEmbeddingService = new GoogleEmbeddingService();