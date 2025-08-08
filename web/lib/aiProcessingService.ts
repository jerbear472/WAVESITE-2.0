import { supabase } from './supabase';
import OpenAI from 'openai';

// Initialize OpenAI client (you can swap this for any LLM provider)
// Use a dummy key if not provided to avoid build errors
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export interface Classification {
  category: string;
  subcategory: string;
  confidence: number;
  reasoning?: string;
}

export interface Entities {
  brands: string[];
  people: string[];
  places: string[];
  hashtags: string[];
  products: string[];
}

export interface ProcessedTrend {
  classification: Classification;
  entities: Entities;
  embedding: number[];
  summary?: string;
}

class AIProcessingService {
  private static instance: AIProcessingService;
  private embeddingCache: Map<string, number[]> = new Map();
  private classificationCache: Map<string, Classification> = new Map();

  private constructor() {}

  static getInstance(): AIProcessingService {
    if (!AIProcessingService.instance) {
      AIProcessingService.instance = new AIProcessingService();
    }
    return AIProcessingService.instance;
  }

  /**
   * Process a trend submission through AI pipeline
   */
  async processTrendSubmission(
    text: string,
    mediaUrl?: string,
    metadata?: any
  ): Promise<ProcessedTrend> {
    try {
      // Run all AI processes in parallel for speed
      const [classification, entities, embedding] = await Promise.all([
        this.classifyTrend(text),
        this.extractEntities(text),
        this.generateEmbedding(text)
      ]);

      return {
        classification,
        entities,
        embedding
      };
    } catch (error) {
      console.error('Error processing trend submission:', error);
      throw error;
    }
  }

  /**
   * Classify trend into categories using LLM
   */
  async classifyTrend(text: string): Promise<Classification> {
    // Check cache first
    const cacheKey = `classify:${text.substring(0, 100)}`;
    if (this.classificationCache.has(cacheKey)) {
      return this.classificationCache.get(cacheKey)!;
    }

    if (!openai) {
      // Return fallback if OpenAI is not configured
      return {
        category: 'uncategorized',
        subcategory: 'general',
        confidence: 0.5,
        reasoning: 'AI processing not configured'
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a cultural trend analyst. Classify the trend into category and subcategory.
            
Categories: fashion, food, memes, music, tech, sports, beauty, automotive, wellness, entertainment, finance, health, travel, lifestyle, gaming, education, real_estate, crypto, sustainability, politics, art, science, business, social_causes

Return a JSON object with: category, subcategory, confidence (0-1), reasoning (brief).`
          },
          {
            role: 'user',
            content: text
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 200
      });

      const classification = JSON.parse(response.choices[0].message.content || '{}');
      
      // Cache the result
      this.classificationCache.set(cacheKey, classification);
      
      return classification;
    } catch (error) {
      console.error('Classification error:', error);
      // Fallback classification
      return {
        category: 'uncategorized',
        subcategory: 'general',
        confidence: 0.5
      };
    }
  }

  /**
   * Extract entities from trend text
   */
  async extractEntities(text: string): Promise<Entities> {
    if (!openai) {
      // Return empty entities if OpenAI is not configured
      return {
        brands: [],
        people: [],
        places: [],
        hashtags: [],
        products: []
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Extract brands, people, places, hashtags, and products from the text.
            
Return a JSON object with arrays for: brands, people, places, hashtags, products.
Each array should contain unique string values. If none found, return empty array.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 300
      });

      return JSON.parse(response.choices[0].message.content || '{"brands":[],"people":[],"places":[],"hashtags":[],"products":[]}');
    } catch (error) {
      console.error('Entity extraction error:', error);
      return {
        brands: [],
        people: [],
        places: [],
        hashtags: [],
        products: []
      };
    }
  }

  /**
   * Generate embedding vector for trend text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = `embed:${text.substring(0, 100)}`;
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    if (!openai) {
      // Return dummy embedding if OpenAI is not configured
      return Array(1536).fill(0);
    }

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
        dimensions: 1536
      });

      const embedding = response.data[0].embedding;
      
      // Cache the result
      this.embeddingCache.set(cacheKey, embedding);
      
      return embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  /**
   * Generate executive summary for a trend
   */
  async generateTrendSummary(
    trendText: string,
    personaDiversity: number,
    geoSpread: number,
    submissionCount: number
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Write a 2-3 sentence executive insight about this trend's spread across personas and regions. 
Be analytical and avoid hype. Focus on cultural significance and adoption patterns.`
          },
          {
            role: 'user',
            content: `Trend: ${trendText}
Persona Diversity: ${(personaDiversity * 100).toFixed(0)}%
Geographic Spread: ${(geoSpread * 100).toFixed(0)}%
Submissions: ${submissionCount}`
          }
        ],
        temperature: 0.5,
        max_tokens: 150
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Summary generation error:', error);
      return 'Trend showing notable activity across multiple segments.';
    }
  }

  /**
   * Predict trend lifecycle stage
   */
  async predictLifecycleStage(
    velocity: number,
    validationRatio: number,
    daysSinceFirst: number
  ): Promise<string> {
    if (velocity > 20 && validationRatio > 0.8) {
      return 'explosive';
    } else if (velocity > 10 && validationRatio > 0.7) {
      return 'growing';
    } else if (velocity > 5 && validationRatio > 0.6) {
      return 'trending';
    } else if (daysSinceFirst > 30 && velocity < 2) {
      return 'declining';
    } else if (daysSinceFirst > 60 && velocity < 1) {
      return 'dormant';
    } else {
      return 'emerging';
    }
  }

  /**
   * Calculate similarity between two embeddings
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Find similar trends using vector search
   */
  async findSimilarTrends(
    embedding: number[],
    threshold: number = 0.85,
    limit: number = 10
  ): Promise<Array<{ id: string; similarity: number }>> {
    try {
      // Convert embedding to PostgreSQL vector format
      const vectorString = `[${embedding.join(',')}]`;
      
      const { data, error } = await supabase.rpc('vector_search_trends', {
        query_vector: vectorString,
        match_threshold: threshold,
        max_results: limit
      });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Vector search error:', error);
      return [];
    }
  }

  /**
   * Clear caches (call periodically to prevent memory issues)
   */
  clearCaches(): void {
    // Keep only recent entries
    const maxCacheSize = 1000;
    
    if (this.embeddingCache.size > maxCacheSize) {
      const entries = Array.from(this.embeddingCache.entries());
      this.embeddingCache = new Map(entries.slice(-500));
    }
    
    if (this.classificationCache.size > maxCacheSize) {
      const entries = Array.from(this.classificationCache.entries());
      this.classificationCache = new Map(entries.slice(-500));
    }
  }
}

export const aiProcessingService = AIProcessingService.getInstance();