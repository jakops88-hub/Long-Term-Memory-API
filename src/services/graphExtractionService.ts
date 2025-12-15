import OpenAI from 'openai';
import { env } from '../config';

export interface ExtractedEntity {
  name: string;
  type: string; // PERSON, PRODUCT, LOCATION, CONCEPT, ORGANIZATION, etc.
  description?: string;
}

export interface ExtractedRelationship {
  from: string; // Entity name
  to: string; // Entity name
  predicate: string; // OWNS, LIKES, WORKS_AT, LOCATED_IN, etc.
}

export interface GraphExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

export class GraphExtractionService {
  private openai: OpenAI;

  constructor() {
    if (!env.openAiApiKey) {
      throw new Error('OpenAI API key is required for graph extraction');
    }
    this.openai = new OpenAI({ apiKey: env.openAiApiKey });
  }

  /**
   * Extract entities and relationships from text using LLM
   */
  async extractGraph(text: string): Promise<GraphExtractionResult> {
    const systemPrompt = `You are a knowledge graph extraction expert. Extract entities and relationships from the given text.

Rules:
1. Identify ENTITIES: People, Products, Locations, Organizations, Concepts, Technologies
2. Identify RELATIONSHIPS: How entities relate to each other (OWNS, LIKES, WORKS_AT, LOCATED_IN, USES, BOUGHT, etc.)
3. Use UPPERCASE for entity types and predicates
4. Keep entity names exactly as they appear in the text
5. Only extract explicit relationships, not inferred ones

Return ONLY valid JSON in this exact format:
{
  "entities": [
    {"name": "John Doe", "type": "PERSON", "description": "A user"},
    {"name": "iPhone 15", "type": "PRODUCT", "description": "A smartphone"}
  ],
  "relationships": [
    {"from": "John Doe", "to": "iPhone 15", "predicate": "BOUGHT"}
  ]
}`;

    const response = await this.openai.chat.completions.create({
      model: env.llmModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    const result = JSON.parse(content) as GraphExtractionResult;

    // Validate structure
    if (!Array.isArray(result.entities) || !Array.isArray(result.relationships)) {
      throw new Error('Invalid graph extraction response format');
    }

    return {
      entities: result.entities || [],
      relationships: result.relationships || [],
      usage: response.usage
    } as GraphExtractionResult & { usage?: OpenAI.CompletionUsage };
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
